import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators } from '@/lib/validation';
import { unstable_cache } from 'next/cache';
import { trackerCorsHeaders } from '@/lib/security/cors';
import { getUserFromRequest } from '@/lib/auth';
import { mergeLimitsWithFallback } from '@/lib/plans/limits';

// Use admin client for server-side operations (bypasses RLS safely)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Survey {
    id: string;
    name: string;
    type: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    questions: Array<{
        id: string;
        type: string;
        text: string;
        options?: string[];
    }>;
    display_frequency: string;
    targeting_rules: Record<string, unknown>;
}

// Cache surveys for 5 minutes
const getCachedSurveys = unstable_cache(
    async (siteId: string) => {
        const { data, error } = await supabaseAdmin
            .from('surveys')
            .select('id, name, type, trigger_type, trigger_config, questions, display_frequency, targeting_rules')
            .eq('site_id', siteId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[surveys] Query error:', error);
            return [];
        }

        return data as Survey[];
    },
    ['active-surveys'],
    { revalidate: 300 } // 5 minutes
);

/**
 * GET /api/surveys
 * Public endpoint for tracker script to fetch active surveys
 * Note: This endpoint is intentionally public (no auth) because it's called
 * from customer websites via the tracker script. However, we validate:
 * 1. Site exists and is not banned
 * 2. Site ID format is valid UUID
 */
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site_id');
        const pagePath = searchParams.get('page_path');
        const deviceType = searchParams.get('device_type');

        if (!siteId) {
            return NextResponse.json(
                { error: 'Missing site_id parameter' },
                { status: 400, headers: trackerCorsHeaders(origin) }
            );
        }

        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json(
                { error: 'Invalid site_id format' },
                { status: 400, headers: trackerCorsHeaders(origin) }
            );
        }

        // Validate site exists and is active (not banned)
        const { data: site, error: siteError } = await supabaseAdmin
            .from('sites')
            .select('id, status')
            .eq('id', siteId)
            .single();

        if (siteError || !site) {
            return NextResponse.json(
                { error: 'Site not found' },
                { status: 404, headers: trackerCorsHeaders(origin) }
            );
        }

        if (site.status === 'banned') {
            return NextResponse.json(
                { error: 'Site access denied' },
                { status: 403, headers: trackerCorsHeaders(origin) }
            );
        }

        // Get cached surveys
        const surveys = await getCachedSurveys(siteId);

        // Filter by targeting rules
        const filteredSurveys = surveys.filter((survey) => {
            const rules = survey.targeting_rules || {};

            // Check page targeting
            if (rules.pages && Array.isArray(rules.pages) && rules.pages.length > 0) {
                if (pagePath && !rules.pages.some((p: string) =>
                    pagePath === p || pagePath.startsWith(p.replace('*', ''))
                )) {
                    return false;
                }
            }

            // Check device targeting
            if (rules.device && Array.isArray(rules.device) && rules.device.length > 0) {
                if (deviceType && !rules.device.includes(deviceType)) {
                    return false;
                }
            }

            return true;
        });

        // Return only necessary fields for client
        const clientSurveys = filteredSurveys.map((s) => ({
            id: s.id,
            type: s.type,
            trigger_type: s.trigger_type,
            trigger_config: s.trigger_config,
            questions: s.questions,
            display_frequency: s.display_frequency,
        }));

        return NextResponse.json(
            { surveys: clientSurveys },
            {
                headers: {
                    ...trackerCorsHeaders(origin),
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            }
        );
    } catch (error: unknown) {
        console.error('[surveys] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: trackerCorsHeaders(null) }
        );
    }
}

/**
 * POST /api/surveys
 * Create a new survey with subscription limit enforcement
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { siteId, name, type, trigger_type, trigger_config, questions, display_frequency, targeting_rules } = body;

        // Validate required fields
        if (!siteId || !name || !type || !questions || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json(
                { error: 'siteId, name, type, and at least 1 question are required' },
                { status: 400 }
            );
        }

        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json({ error: 'Invalid siteId format' }, { status: 400 });
        }

        // Get site and verify ownership
        const { data: site, error: siteError } = await supabaseAdmin
            .from('sites')
            .select('user_id')
            .eq('id', siteId)
            .single();

        if (siteError || !site) {
            return NextResponse.json(
                { error: 'Site not found' },
                { status: 404 }
            );
        }

        // Verify user owns this site
        if (site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'You do not have access to this site' },
                { status: 403 }
            );
        }

        // --- LIMIT ENFORCEMENT START ---
        // Get user's subscription limits
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select(`
                status,
                subscription_plans (
                    name,
                    limits
                )
            `)
            .eq('user_id', site.user_id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        // Get limits using centralized fallback logic
        let maxSurveys = 0; // Free plan default

        if (subscription?.status === 'active' && subscription?.subscription_plans) {
            const plan = Array.isArray(subscription.subscription_plans)
                ? subscription.subscription_plans[0]
                : subscription.subscription_plans;
            const mergedLimits = mergeLimitsWithFallback(plan.limits, plan.name);
            maxSurveys = mergedLimits.active_surveys;
        }

        // Count ACTIVE surveys for this site
        if (maxSurveys !== -1) {
            const { count: activeCount, error: countError } = await supabaseAdmin
                .from('surveys')
                .select('id', { count: 'exact', head: true })
                .eq('site_id', siteId)
                .eq('is_active', true);

            if (countError) {
                console.error('[surveys] Count error:', countError);
            } else {
                if ((activeCount || 0) >= maxSurveys) {
                    return NextResponse.json(
                        { error: `Plan limit reached. You can have ${maxSurveys} active survey${maxSurveys === 1 ? '' : 's'}. Deactivate an existing survey or upgrade.` },
                        { status: 403 }
                    );
                }
            }
        }
        // --- LIMIT ENFORCEMENT END ---

        // Create survey
        const { data: newSurvey, error: createError } = await supabaseAdmin
            .from('surveys')
            .insert({
                site_id: siteId,
                name: name.trim(),
                type,
                trigger_type: trigger_type || 'page_load',
                trigger_config: trigger_config || {},
                questions,
                display_frequency: display_frequency || 'once',
                targeting_rules: targeting_rules || {},
                is_active: true,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (createError) {
            console.error('[surveys] Create error:', createError);
            return NextResponse.json(
                { error: 'Failed to create survey' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { survey: newSurvey },
            { status: 201 }
        );

    } catch (error: unknown) {
        console.error('[surveys] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return new NextResponse(null, {
        status: 200,
        headers: trackerCorsHeaders(origin),
    });
}
