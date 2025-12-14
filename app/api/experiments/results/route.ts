/**
 * Experiment Results API
 * 
 * Statistical analysis endpoint:
 * - GET: Calculate conversion rates, Z-scores, confidence levels
 * 
 * Queries ClickHouse for experiment data and runs statistical analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClickHouseClient } from '@/lib/clickhouse';
import { getCachedResults } from '@/lib/experiments/cache';
import {
    analyzeExperiment,
    getStatusMessage,
    calculateMinimumSampleSize,
    estimateDaysToSignificance
} from '@/lib/experiments/stats';
import type { VariantStats, ExperimentResults } from '@/lib/experiments/types';
import { getUserFromRequest } from '@/lib/auth';
import { secureCorsHeaders } from '@/lib/security';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ClickHouse client
const clickhouse = getClickHouseClient();

// SECURITY: Use secure CORS headers (validates origin instead of wildcard)
const corsHeaders = secureCorsHeaders;

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders('*')
    });
}

/**
 * GET /api/experiments/results?siteId=xxx&experimentId=yyy
 * Get experiment results with statistical analysis
 */
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const experimentId = searchParams.get('experimentId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!siteId || !experimentId) {
            return NextResponse.json(
                { error: 'siteId and experimentId are required' },
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

        // Verify user has access to the site
        const { data: site } = await supabaseAdmin
            .from('sites')
            .select('user_id')
            .eq('id', siteId)
            .single();

        if (!site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403, headers: corsHeaders(origin) }
            );
        }

        // Get experiment config from Supabase
        const { data: experiment, error: expError } = await supabaseAdmin
            .from('experiments')
            .select('*')
            .eq('id', experimentId)
            .eq('site_id', siteId)
            .single();

        if (expError || !experiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404, headers: corsHeaders(origin) }
            );
        }

        // Use caching for results
        const results = await getCachedResults(
            siteId,
            experimentId,
            async () => computeResults(siteId, experimentId, experiment, startDate, endDate),
            startDate || undefined,
            endDate || undefined
        );

        return NextResponse.json(
            { results },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error) {
        console.error('[experiments/results] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}

/**
 * Compute experiment results from ClickHouse data
 */
async function computeResults(
    siteId: string,
    experimentId: string,
    experiment: Record<string, unknown>,
    startDate: string | null,
    endDate: string | null
): Promise<ExperimentResults> {
    // Get goal event from experiment config
    const goalEvent = (experiment.goal_event as string) || 'conversion';

    // Build date filter with parameterized values
    const queryParams: Record<string, string> = {
        siteId: siteId,
        experimentId: experimentId,
        goalEvent: goalEvent,
    };

    let dateFilter = '';
    if (startDate) {
        queryParams.startDate = startDate;
        dateFilter += ` AND timestamp >= {startDate:String}`;
    }
    if (endDate) {
        queryParams.endDate = endDate;
        dateFilter += ` AND timestamp <= {endDate:String}`;
    }

    // SECURITY: Parameterized query to prevent SQL injection
    const query = `
    SELECT 
      arrayJoin(variant_ids) as variant_id,
      countDistinct(session_id) as users,
      countIf(
        JSONExtractString(assumeNotNull(data), 'event_name') = {goalEvent:String}
        OR event_type = {goalEvent:String}
      ) as conversions
    FROM events
    WHERE site_id = {siteId:String}
      AND has(experiment_ids, {experimentId:String})
      ${dateFilter}
    GROUP BY variant_id
    ORDER BY variant_id
  `;

    try {
        const result = await clickhouse.query({
            query,
            format: 'JSONEachRow',
            query_params: queryParams,
        });

        const rawRows = await result.json();
        const rows = rawRows as { variant_id: string; users: string; conversions: string }[];

        // Map variant IDs to names from experiment config
        const variantMap = new Map<string, string>();
        const variants = experiment.variants as Array<{ id: string; name: string }> || [];
        variants.forEach(v => variantMap.set(v.id, v.name));

        // Build variant stats
        const variantStats: VariantStats[] = rows.map(row => {
            const users = parseInt(row.users) || 0;
            const conversions = parseInt(row.conversions) || 0;
            return {
                variant_id: row.variant_id,
                variant_name: variantMap.get(row.variant_id) || row.variant_id,
                users,
                conversions,
                conversion_rate: users > 0 ? (conversions / users) * 100 : 0
            };
        });

        // Calculate total users
        const totalUsers = variantStats.reduce((sum, v) => sum + v.users, 0);

        // Run statistical analysis
        const analysis = analyzeExperiment(variantStats);

        // Calculate days running
        const startedAt = experiment.started_at as string | undefined;
        const daysRunning = startedAt
            ? Math.floor((Date.now() - new Date(startedAt).getTime()) / (24 * 60 * 60 * 1000))
            : 0;

        // Get status message
        const statusMessage = getStatusMessage(
            analysis.confidence_level || 0,
            analysis.is_significant,
            analysis.winner,
            totalUsers
        );

        // Estimate sample size needed
        const baselineRate = variantStats[0]?.conversion_rate / 100 || 0.05;
        const minimumSampleSize = calculateMinimumSampleSize(baselineRate, 0.1); // 10% MDE

        return {
            experiment_id: experimentId,
            experiment_name: experiment.name as string,
            status: experiment.status as ExperimentResults['status'],
            total_users: totalUsers,
            variants: variantStats,
            ...analysis,
            started_at: startedAt,
            days_running: daysRunning,
            // Additional helper data
            status_message: statusMessage,
            minimum_sample_size: minimumSampleSize,
            has_enough_data: totalUsers >= minimumSampleSize * 2
        } as ExperimentResults & { status_message: string; minimum_sample_size: number; has_enough_data: boolean };

    } catch (error) {
        console.error('[experiments/results] ClickHouse query error:', error);

        // Return empty results on query error
        return {
            experiment_id: experimentId,
            experiment_name: experiment.name as string,
            status: experiment.status as ExperimentResults['status'],
            total_users: 0,
            variants: [],
            is_significant: false,
            started_at: experiment.started_at as string | undefined,
            days_running: 0
        };
    }
}
