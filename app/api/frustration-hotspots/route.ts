import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { apiCache, generateCacheKey, withCache } from '@/lib/cache';

interface _FrustrationHotspot {
    pagePath: string;
    elementSelector: string;
    x: number;
    y: number;
    rageClickCount: number;
    deadClickCount: number;
    frustrationScore: number;
    affectedSessions: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteId, pagePath, deviceType, startDate, endDate, limit = 50 } = body;

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

        // Build cache key
        const cacheKey = generateCacheKey(siteId, 'frustration-hotspots', {
            pagePath,
            deviceType,
            startDate,
            endDate,
            limit,
        });

        const hotspots = await withCache(
            apiCache,
            cacheKey,
            async () => {
                const clickhouse = getClickHouseClient();

                // Build date filter
                let dateFilter = 'timestamp > now() - INTERVAL 30 DAY';
                if (startDate && endDate) {
                    dateFilter = `timestamp BETWEEN toDateTime('${startDate}') AND toDateTime('${endDate}')`;
                }

                // Query for rage and dead click hotspots
                const query = `
          SELECT 
            page_path,
            element_selector,
            toInt32(avg(x)) as x,
            toInt32(avg(y)) as y,
            countIf(event_type = 'rage_click' OR click_count >= 3) as rage_click_count,
            countIf(event_type = 'dead_click' OR is_dead_click = 1) as dead_click_count,
            toInt32(
              (countIf(event_type = 'rage_click' OR click_count >= 3) * 10 + 
               countIf(event_type = 'dead_click' OR is_dead_click = 1) * 5) 
              / greatest(count(*), 1) * 10
            ) as frustration_score,
            uniq(session_id) as affected_sessions
          FROM events
          WHERE 
            site_id = {siteId:String}
            AND ${dateFilter}
            AND event_type IN ('click', 'dead_click', 'rage_click')
            ${pagePath ? 'AND page_path = {pagePath:String}' : ''}
            ${deviceType ? 'AND device_type = {deviceType:String}' : ''}
            AND element_selector IS NOT NULL
            AND element_selector != ''
          GROUP BY page_path, element_selector
          HAVING rage_click_count > 0 OR dead_click_count > 2
          ORDER BY frustration_score DESC, rage_click_count DESC
          LIMIT {limit:UInt32}
        `;

                const result = await clickhouse.query({
                    query,
                    query_params: {
                        siteId,
                        pagePath: pagePath || '',
                        deviceType: deviceType || '',
                        limit: Math.min(limit, 200)
                    },
                    format: 'JSONEachRow',
                });

                interface HotspotRow {
                    page_path: string;
                    element_selector: string;
                    x: number;
                    y: number;
                    rage_click_count: string;
                    dead_click_count: string;
                    frustration_score: number;
                    affected_sessions: string;
                }

                const rawData = await result.json();
                const data = rawData as HotspotRow[];

                return data.map(row => ({
                    pagePath: row.page_path,
                    elementSelector: row.element_selector,
                    x: row.x,
                    y: row.y,
                    rageClickCount: parseInt(row.rage_click_count),
                    deadClickCount: parseInt(row.dead_click_count),
                    frustrationScore: Math.min(row.frustration_score, 100),
                    affectedSessions: parseInt(row.affected_sessions),
                }));
            },
            60000 // 1 minute cache
        );

        // Calculate summary stats
        const summary = {
            totalHotspots: hotspots.length,
            totalRageClicks: hotspots.reduce((sum, h) => sum + h.rageClickCount, 0),
            totalDeadClicks: hotspots.reduce((sum, h) => sum + h.deadClickCount, 0),
            avgFrustrationScore: hotspots.length > 0
                ? Math.round(hotspots.reduce((sum, h) => sum + h.frustrationScore, 0) / hotspots.length)
                : 0,
            affectedPages: new Set(hotspots.map(h => h.pagePath)).size,
        };

        return NextResponse.json({ hotspots, summary });
    } catch (error: unknown) {
        console.error('[frustration-hotspots] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
