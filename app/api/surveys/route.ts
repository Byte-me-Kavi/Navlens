import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { validators } from '@/lib/validation';
import { unstable_cache } from 'next/cache';

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
        const { data, error } = await supabase
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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site_id');
        const pagePath = searchParams.get('page_path');
        const deviceType = searchParams.get('device_type');

        if (!siteId) {
            return NextResponse.json({ error: 'Missing site_id parameter' }, { status: 400 });
        }

        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json({ error: 'Invalid site_id format' }, { status: 400 });
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
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            }
        );
    } catch (error: unknown) {
        console.error('[surveys] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/surveys
 * Create a new survey with subscription limit enforcement
 */
export async function POST(request: NextRequest) {
    try {
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

        // Get user ID from site
        const { data: site, error: siteError } = await supabase
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

        // --- LIMIT ENFORCEMENT START ---
        // Get user's subscription limits
        const { data: profile } = await supabase
            .from('profiles')
            .select(`
                subscriptions (
                    status,
                    subscription_plans (
                        name,
                        limits
                    )
                )
            `)
            .eq('user_id', site.user_id)
            .single();

        // Default limit (Free plan) -> 0 surveys
        let maxSurveys = 0;

        if (profile?.subscriptions) {
            const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
            if (sub?.status === 'active' && sub?.subscription_plans) {
                const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
                const limits = plan.limits as any;

                if (limits?.active_surveys !== undefined) {
                    maxSurveys = limits.active_surveys;
                } else {
                    // Fallback logic
                    const planName = plan.name?.toLowerCase() || '';
                    if (planName.includes('starter')) maxSurveys = 1;
                    else if (planName.includes('pro') || planName.includes('enterprise')) maxSurveys = -1; // Unlimited
                }
            }
        }

        // Count ACTIVE surveys for this site
        if (maxSurveys !== -1) {
            const { count: activeCount, error: countError } = await supabase
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
        const { data: newSurvey, error: createError } = await supabase
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
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
