import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { apiCache, generateCacheKey, withCache } from '@/lib/cache';

interface PerformanceMetric {
    timestamp: string;
    lcp: number;
    cls: number;
    inp: number;
    fcp: number;
    ttfb: number;
    sessions: number;
}

interface DeviceBreakdown {
    deviceType: string;
    avgLcp: number;
    avgCls: number;
    avgInp: number;
    avgFcp: number;
    avgTtfb: number;
    sessions: number;
}

interface BrowserBreakdown {
    browser: string;
    avgLcp: number;
    avgCls: number;
    sessions: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteId, pagePath, startDate, endDate, granularity = 'day' } = body;

        if (!siteId) {
            return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        // Authenticate
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized) {
            return createUnauthenticatedResponse();
        }
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        const cacheKey = generateCacheKey(siteId, 'performance-metrics', {
            pagePath,
            startDate,
            endDate,
            granularity,
        });

        const data = await withCache(
            apiCache,
            cacheKey,
            async () => {
                const clickhouse = getClickHouseClient();

                // Build date filter - use 90 days by default
                let dateFilter = 'timestamp > now() - INTERVAL 90 DAY';
                if (startDate && endDate) {
                    // Convert ISO dates to YYYY-MM-DD HH:MM:SS format for ClickHouse
                    const formatDate = (d: string) => d.replace('T', ' ').replace('Z', '').split('.')[0];
                    dateFilter = `timestamp BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'`;
                }

                console.log('[performance-metrics] Using date filter:', dateFilter);

                // Granularity format
                const timeFormat = granularity === 'hour' ? '%Y-%m-%d %H:00' :
                    granularity === 'week' ? '%Y-%W' : '%Y-%m-%d';

                try {
                    // Session/event counts from events table
                    const trendsQuery = `
                        SELECT 
                            formatDateTime(timestamp, '${timeFormat}') as time_bucket,
                            uniq(session_id) as sessions,
                            count() as total_events
                        FROM events
                        WHERE 
                            site_id = {siteId:String}
                            AND ${dateFilter}
                            ${pagePath ? 'AND page_path = {pagePath:String}' : ''}
                        GROUP BY time_bucket
                        ORDER BY time_bucket
                    `;

                    // Device breakdown from events
                    const deviceQuery = `
                        SELECT 
                            device_type,
                            uniq(session_id) as sessions,
                            count() as total_events
                        FROM events
                        WHERE 
                            site_id = {siteId:String}
                            AND ${dateFilter}
                            ${pagePath ? 'AND page_path = {pagePath:String}' : ''}
                        GROUP BY device_type
                    `;

                    // Web Vitals from debug_events table
                    const vitalsQuery = `
                        SELECT 
                            vital_name,
                            avg(vital_value) as avg_value,
                            count() as count
                        FROM debug_events
                        WHERE 
                            site_id = {siteId:String}
                            AND event_type = 'web_vital'
                            AND ${dateFilter}
                            ${pagePath ? 'AND page_path = {pagePath:String}' : ''}
                        GROUP BY vital_name
                    `;

                    // Browser breakdown - extract browser from user_agent
                    const browserQuery = `
                        SELECT 
                            multiIf(
                                user_agent LIKE '%Chrome%' AND user_agent NOT LIKE '%Edge%' AND user_agent NOT LIKE '%OPR%', 'Chrome',
                                user_agent LIKE '%Firefox%', 'Firefox',
                                user_agent LIKE '%Safari%' AND user_agent NOT LIKE '%Chrome%', 'Safari',
                                user_agent LIKE '%Edge%', 'Edge',
                                user_agent LIKE '%OPR%' OR user_agent LIKE '%Opera%', 'Opera',
                                'Other'
                            ) as browser,
                            uniq(session_id) as sessions,
                            count() as total_events
                        FROM events
                        WHERE 
                            site_id = {siteId:String}
                            AND ${dateFilter}
                            ${pagePath ? 'AND page_path = {pagePath:String}' : ''}
                        GROUP BY browser
                        ORDER BY sessions DESC
                    `;

                    const [trendsResult, deviceResult, vitalsResult, browserResult] = await Promise.all([
                        clickhouse.query({ query: trendsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: deviceQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: vitalsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }).catch(e => {
                            console.error('[performance-metrics] Vitals query error:', e);
                            return null;
                        }),
                        clickhouse.query({ query: browserQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                    ]);

                    const [trends, devices, browsers] = await Promise.all([
                        trendsResult.json(),
                        deviceResult.json(),
                        browserResult.json(),
                    ]);

                    // Parse vitals if available
                    interface VitalRow { vital_name: string; avg_value: string; count: string }
                    let vitals: VitalRow[] = [];
                    if (vitalsResult) {
                        try {
                            vitals = await vitalsResult.json() as VitalRow[];
                            console.log('[performance-metrics] Vitals raw result:', JSON.stringify(vitals));
                        } catch (e) {
                            console.error('[performance-metrics] Vitals parse error:', e);
                            vitals = [];
                        }
                    } else {
                        console.log('[performance-metrics] Vitals query returned null (no table or error)');
                    }

                    // Build vitals map
                    const vitalsMap: Record<string, number> = {};
                    for (const v of vitals) {
                        vitalsMap[v.vital_name] = Number(v.avg_value) || 0;
                    }
                    console.log('[performance-metrics] Vitals map:', vitalsMap);

                    return {
                        trends,
                        devices,
                        browsers,
                        vitals: vitalsMap,
                    };
                } catch (queryError) {
                    console.error('[performance-metrics] Query error:', queryError);
                    return { trends: [], devices: [], browsers: [], vitals: {} };
                }
            },
            120000 // 2 minute cache
        );

        // Calculate overall averages - use vitals from debug_events if available
        const trends = data.trends as PerformanceMetric[];
        const vitals = (data as { vitals?: Record<string, number> }).vitals || {};

        const overallMetrics = {
            avgLcp: Math.round(vitals['LCP'] || 0),
            avgCls: (vitals['CLS'] || 0).toFixed(3),
            avgInp: Math.round(vitals['INP'] || 0),
            avgFcp: Math.round(vitals['FCP'] || 0),
            avgTtfb: Math.round(vitals['TTFB'] || 0),
            totalSessions: trends.reduce((s, t) => s + Number((t as { sessions?: number | string }).sessions || 0), 0),
        };

        return NextResponse.json({
            trends: data.trends,
            deviceBreakdown: data.devices,
            browserBreakdown: data.browsers,
            overall: overallMetrics,
        });
    } catch (error) {
        console.error('[performance-metrics] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
