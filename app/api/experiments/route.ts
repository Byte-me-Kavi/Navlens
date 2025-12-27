/**
 * Experiments CRUD API
 * 
 * Endpoints for managing A/B test experiments:
 * - GET: List experiments for a site
 * - POST: Create new experiment
 * 
 * All operations are cached for performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMonitoring } from "@/lib/api-middleware";
import { createClient } from '@supabase/supabase-js';
import {
    invalidateExperimentCaches,
    getCachedActiveExperiments
} from '@/lib/experiments/cache';
import type {
    CreateExperimentRequest,
    Variant,
    ExperimentGoal
} from '@/lib/experiments/types';
import { getUserFromRequest } from '@/lib/auth';
import { secureCorsHeaders } from '@/lib/security';
import { validateAndSanitizeGoals } from '@/lib/experiments/goalValidation';
import { mergeLimitsWithFallback } from '@/lib/plans/limits';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SECURITY: Use secure CORS headers (validates origin instead of wildcard)
const corsHeaders = secureCorsHeaders;

export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(origin)
    });
}

/**
 * GET /api/experiments?siteId=xxx
 * List all experiments for a site (with caching)
 */
async function GET_handler(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        // Get site ID from query params
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const status = searchParams.get('status'); // Optional filter
        const activeOnly = searchParams.get('activeOnly') === 'true';

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        // Verify user has access to this site
        const { data: site, error: siteError } = await supabaseAdmin
            .from('sites')
            .select('id, user_id')
            .eq('id', siteId)
            .single();

        if (siteError || !site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Site not found or access denied' },
                { status: 403, headers: corsHeaders(origin) }
            );
        }

        // Fetch experiments (with caching for active experiments)
        if (activeOnly) {
            const experiments = await getCachedActiveExperiments(siteId, async () => {
                const { data, error } = await supabaseAdmin
                    .from('experiments')
                    .select('*')
                    .eq('site_id', siteId)
                    .eq('status', 'running')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            });

            return NextResponse.json(
                { experiments },
                { status: 200, headers: corsHeaders(origin) }
            );
        }

        // Non-cached query with optional status filter
        let query = supabaseAdmin
            .from('experiments')
            .select('*')
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: experiments, error } = await query;

        if (error) {
            console.error('[experiments] Query error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch experiments' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }


        return NextResponse.json(
            { experiments: experiments || [] },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error: unknown) {
        console.error('[experiments] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}

export const GET = withMonitoring(GET_handler);

/**
 * POST /api/experiments
 * Create a new experiment
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        const body = await request.json() as CreateExperimentRequest & { siteId: string; goals?: Partial<ExperimentGoal>[] };
        const { siteId, name, description, variants, traffic_percentage, goal_event, target_urls, goals } = body;

        // Validate required fields
        if (!siteId || !name || !variants || variants.length < 2) {
            return NextResponse.json(
                { error: 'siteId, name, and at least 2 variants are required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Verify user has access to this site
        const { data: site, error: siteError } = await supabaseAdmin
            .from('sites')
            .select('id, user_id')
            .eq('id', siteId)
            .single();

        if (siteError || !site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Site not found or access denied' },
                { status: 403, headers: corsHeaders(origin) }
            );
        }

        // Generate variant IDs and normalize weights
        const processedVariants: Variant[] = variants.map((v, index) => ({
            id: `variant_${index}`,
            name: v.name || (index === 0 ? 'control' : `variant_${String.fromCharCode(97 + index - 1)}`),
            weight: v.weight || Math.floor(100 / variants.length),
            description: undefined
        }));

        // Validate and sanitize goals if provided
        let processedGoals: ExperimentGoal[] = [];
        if (goals && Array.isArray(goals) && goals.length > 0) {
            const goalValidation = validateAndSanitizeGoals(goals);
            if (goalValidation.errors.length > 0) {
                return NextResponse.json(
                    { error: 'Invalid goals: ' + goalValidation.errors.join('; ') },
                    { status: 400, headers: corsHeaders(origin) }
                );
            }
            processedGoals = goalValidation.goals;
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
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        // Get limits using centralized fallback logic
        let maxExperiments = 0; // Free plan default

        if (subscription?.status === 'active' && subscription?.subscription_plans) {
            const plan = Array.isArray(subscription.subscription_plans)
                ? subscription.subscription_plans[0]
                : subscription.subscription_plans;
            const mergedLimits = mergeLimitsWithFallback(plan.limits, plan.name);
            maxExperiments = mergedLimits.active_experiments;
        }

        // Count ACTIVE experiments for this site
        // (Free tier 0 means NO experiments allowed at all, or no *concurrent* ones? Usually means 0.)

        if (maxExperiments !== -1) {
            const { count: activeCount, error: countError } = await supabaseAdmin
                .from('experiments')
                .select('id', { count: 'exact', head: true })
                .eq('site_id', siteId)
                .eq('status', 'running');

            if (countError) {
                console.error('[experiments] Count error:', countError);
            } else {
                if ((activeCount || 0) >= maxExperiments) {
                    return NextResponse.json(
                        { error: `Plan limit reached. You can have ${maxExperiments} active experiment${maxExperiments === 1 ? '' : 's'}. Stop an existing experiment or upgrade.` },
                        { status: 403, headers: corsHeaders(origin) }
                    );
                }
            }
        }
        // --- LIMIT ENFORCEMENT END ---

        // Create experiment
        const experimentData = {
            site_id: siteId,
            name: name.trim(),
            description: description?.trim() || null,
            status: 'draft',
            variants: processedVariants,
            traffic_percentage: traffic_percentage ?? 100,
            goals: processedGoals,  // NEW: Store goals array
            goal_event: goal_event || (processedGoals.find(g => g.is_primary)?.event_name) || null,  // Backward compat
            target_urls: target_urls || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: experiment, error } = await supabaseAdmin
            .from('experiments')
            .insert(experimentData)
            .select()
            .single();

        if (error) {
            console.error('[experiments] Create error:', error);
            return NextResponse.json(
                { error: 'Failed to create experiment' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        // Invalidate cache
        invalidateExperimentCaches(siteId);

        return NextResponse.json(
            { experiment },
            { status: 201, headers: corsHeaders(origin) }
        );

    } catch (error: unknown) {
        console.error('[experiments] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
