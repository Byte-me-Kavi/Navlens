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

                // Build date filter
                let dateFilter = 'timestamp > now() - INTERVAL 30 DAY';
                if (startDate && endDate) {
                    dateFilter = `timestamp BETWEEN toDateTime('${startDate}') AND toDateTime('${endDate}')`;
                }

                // Granularity format
                const timeFormat = granularity === 'hour' ? '%Y-%m-%d %H:00' :
                    granularity === 'week' ? '%Y-%W' : '%Y-%m-%d';

                try {
                    // Simple aggregate query from events table
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

                    // Device breakdown
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

                    const [trendsResult, deviceResult] = await Promise.all([
                        clickhouse.query({ query: trendsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: deviceQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                    ]);

                    const [trends, devices] = await Promise.all([
                        trendsResult.json(),
                        deviceResult.json(),
                    ]);

                    return { trends, devices, browsers: [] };
                } catch (queryError) {
                    console.error('[performance-metrics] Query error:', queryError);
                    return { trends: [], devices: [], browsers: [] };
                }
            },
            120000 // 2 minute cache
        );

        // Calculate overall averages
        const trends = data.trends as PerformanceMetric[];
        const overallMetrics = {
            avgLcp: trends.length > 0 ? Math.round(trends.reduce((s, t) => s + (t.lcp || 0), 0) / trends.length) : 0,
            avgCls: trends.length > 0 ? (trends.reduce((s, t) => s + (t.cls || 0), 0) / trends.length).toFixed(3) : '0',
            avgInp: trends.length > 0 ? Math.round(trends.reduce((s, t) => s + (t.inp || 0), 0) / trends.length) : 0,
            avgFcp: trends.length > 0 ? Math.round(trends.reduce((s, t) => s + (t.fcp || 0), 0) / trends.length) : 0,
            avgTtfb: trends.length > 0 ? Math.round(trends.reduce((s, t) => s + (t.ttfb || 0), 0) / trends.length) : 0,
            totalSessions: trends.reduce((s, t) => s + (t.sessions || 0), 0),
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
