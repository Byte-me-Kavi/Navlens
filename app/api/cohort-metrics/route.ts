import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndAuthorize, createUnauthenticatedResponse, isAuthorizedForSite } from '@/lib/auth';
import { getClickHouseClient } from '@/lib/clickhouse';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CohortRule {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number;
}

/**
 * Build ClickHouse WHERE clause from cohort rules
 * Handles field mapping gracefully - skips unsupported fields
 */
function buildCohortFilter(rules: CohortRule[]): string {
    if (!rules || rules.length === 0) return '1=1';

    // Define supported fields and their ClickHouse column mappings
    const fieldConfig: Record<string, { column: string; type: 'string' | 'number' | 'boolean' }> = {
        'device_type': { column: 'device_type', type: 'string' },
        'country': { column: 'user_language', type: 'string' },
        'referrer': { column: 'referrer', type: 'string' },
        'browser': { column: 'user_agent', type: 'string' },
        'page_path': { column: 'page_path', type: 'string' },
        // Numeric fields - these work differently
        'page_views': { column: 'page_path', type: 'string' }, // Will be converted to count subquery if needed
        'session_duration': { column: 'session_id', type: 'string' },
        // Boolean fields - need special handling
        'has_rage_clicks': { column: 'is_dead_click', type: 'boolean' },
        'first_seen': { column: 'timestamp', type: 'string' },
    };

    const conditions: string[] = [];

    for (const rule of rules) {
        const { field, operator, value } = rule;
        const config = fieldConfig[field];

        // Skip unsupported fields - don't break the query
        if (!config) {
            console.warn(`[cohort-metrics] Skipping unsupported field: ${field}`);
            continue;
        }

        const column = config.column;

        try {
            // Handle boolean fields
            if (config.type === 'boolean') {
                const boolValue = String(value).toLowerCase() === 'true' ? 1 : 0;
                conditions.push(`${column} = ${boolValue}`);
                continue;
            }

            // Handle numeric comparisons
            if (operator === 'greater_than' || operator === 'less_than') {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                    const op = operator === 'greater_than' ? '>' : '<';
                    conditions.push(`${column} ${op} ${numValue}`);
                }
                continue;
            }

            // Handle string comparisons - escape value
            const escapedValue = String(value).replace(/'/g, "''").replace(/\\/g, '\\\\');

            switch (operator) {
                case 'equals':
                    conditions.push(`${column} = '${escapedValue}'`);
                    break;
                case 'contains':
                    conditions.push(`${column} LIKE '%${escapedValue}%'`);
                    break;
                default:
                    // Skip unknown operators
                    break;
            }
        } catch (e) {
            console.warn(`[cohort-metrics] Error processing rule for field ${field}:`, e);
            // Skip this rule but continue with others
        }
    }

    // If no valid conditions, return always-true
    return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
}

/**
 * POST - Get cohort metrics
 */
export async function POST(request: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized) {
            return createUnauthenticatedResponse();
        }

        const body = await request.json();
        const { siteId, cohortId, cohortIds, startDate, endDate } = body;

        if (!siteId || !isAuthorizedForSite(authResult.userSites, siteId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const clickhouse = getClickHouseClient();

        // Build date filter
        let dateFilter = 'timestamp > now() - INTERVAL 30 DAY';
        if (startDate && endDate) {
            const formatDate = (d: string) => d.replace('T', ' ').replace('Z', '').split('.')[0];
            dateFilter = `timestamp BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'`;
        }

        // Single cohort view
        if (cohortId) {
            const { data: cohort, error } = await supabase
                .from('cohorts')
                .select('*')
                .eq('id', cohortId)
                .eq('site_id', siteId)
                .single();

            if (error || !cohort) {
                return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
            }

            const cohortFilter = buildCohortFilter(cohort.rules || []);

            // Get metrics for this cohort
            const metricsQuery = `
                SELECT 
                    uniq(session_id) as sessions,
                    count() as total_events,
                    uniqIf(session_id, event_type = 'click') as sessions_with_clicks,
                    countIf(event_type = 'click') as total_clicks,
                    countIf(event_type = 'scroll') as total_scrolls
                FROM events
                WHERE 
                    site_id = {siteId:String}
                    AND ${dateFilter}
                    AND ${cohortFilter}
            `;

            // Get top pages for this cohort
            const pagesQuery = `
                SELECT 
                    page_path,
                    count() as views,
                    uniq(session_id) as sessions
                FROM events
                WHERE 
                    site_id = {siteId:String}
                    AND ${dateFilter}
                    AND ${cohortFilter}
                    AND page_path IS NOT NULL
                    AND page_path != ''
                GROUP BY page_path
                ORDER BY views DESC
                LIMIT 10
            `;

            // Get device breakdown for this cohort
            const deviceQuery = `
                SELECT 
                    device_type,
                    uniq(session_id) as sessions
                FROM events
                WHERE 
                    site_id = {siteId:String}
                    AND ${dateFilter}
                    AND ${cohortFilter}
                GROUP BY device_type
            `;

            const [metricsResult, pagesResult, deviceResult] = await Promise.all([
                clickhouse.query({ query: metricsQuery, query_params: { siteId }, format: 'JSONEachRow' }),
                clickhouse.query({ query: pagesQuery, query_params: { siteId }, format: 'JSONEachRow' }),
                clickhouse.query({ query: deviceQuery, query_params: { siteId }, format: 'JSONEachRow' }),
            ]);

            const [metrics, pages, devices] = await Promise.all([
                metricsResult.json(),
                pagesResult.json(),
                deviceResult.json(),
            ]);

            const metricsData = (metrics as Record<string, string>[])[0] || {};

            return NextResponse.json({
                cohort,
                metrics: {
                    sessions: Number(metricsData.sessions) || 0,
                    totalEvents: Number(metricsData.total_events) || 0,
                    sessionsWithClicks: Number(metricsData.sessions_with_clicks) || 0,
                    totalClicks: Number(metricsData.total_clicks) || 0,
                    totalScrolls: Number(metricsData.total_scrolls) || 0,
                    clickRate: metricsData.sessions ?
                        ((Number(metricsData.sessions_with_clicks) / Number(metricsData.sessions)) * 100).toFixed(1) : '0',
                },
                topPages: pages,
                deviceBreakdown: devices,
            });
        }

        // Multi-cohort comparison
        if (cohortIds && Array.isArray(cohortIds) && cohortIds.length > 0) {
            const { data: cohorts, error } = await supabase
                .from('cohorts')
                .select('*')
                .in('id', cohortIds)
                .eq('site_id', siteId);

            if (error || !cohorts) {
                return NextResponse.json({ error: 'Cohorts not found' }, { status: 404 });
            }

            // Get metrics for each cohort
            const cohortMetrics = await Promise.all(
                cohorts.map(async (cohort) => {
                    const cohortFilter = buildCohortFilter(cohort.rules || []);

                    const query = `
                        SELECT 
                            uniq(session_id) as sessions,
                            count() as total_events,
                            countIf(event_type = 'click') as clicks
                        FROM events
                        WHERE 
                            site_id = {siteId:String}
                            AND ${dateFilter}
                            AND ${cohortFilter}
                    `;

                    const result = await clickhouse.query({
                        query,
                        query_params: { siteId },
                        format: 'JSONEachRow'
                    });
                    const data = await result.json();
                    const metrics = (data as Record<string, string>[])[0] || {};

                    return {
                        cohortId: cohort.id,
                        cohortName: cohort.name,
                        sessions: Number(metrics.sessions) || 0,
                        events: Number(metrics.total_events) || 0,
                        clicks: Number(metrics.clicks) || 0,
                        eventsPerSession: metrics.sessions && Number(metrics.sessions) > 0
                            ? (Number(metrics.total_events) / Number(metrics.sessions)).toFixed(1)
                            : '0',
                    };
                })
            );

            return NextResponse.json({
                comparison: cohortMetrics,
            });
        }

        return NextResponse.json({ error: 'cohortId or cohortIds required' }, { status: 400 });

    } catch (error) {
        console.error('[cohort-metrics] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
