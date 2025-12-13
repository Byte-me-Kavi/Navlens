import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { journeyCache, generateCacheKey, withCache } from '@/lib/cache';

interface PathNode {
    source: string;
    target: string;
    value: number;
}

interface JourneyPath {
    path: string[];
    count: number;
    avgDuration: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteId, startDate, endDate, limit = 100 } = body;

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

        const cacheKey = generateCacheKey(siteId, 'user-journeys', { startDate, endDate, limit });

        const journeyData = await withCache(
            journeyCache,
            cacheKey,
            async () => {
                const clickhouse = getClickHouseClient();

                // Build date filter
                let dateFilter = 'timestamp > now() - INTERVAL 30 DAY';
                if (startDate && endDate) {
                    dateFilter = `timestamp BETWEEN toDateTime('${startDate}') AND toDateTime('${endDate}')`;
                }

                // Get session paths (sequences of pages visited)
                const pathsQuery = `
          SELECT 
            session_id,
            groupArray(page_path) as path,
            count() as page_views,
            max(toUnixTimestamp(timestamp)) - min(toUnixTimestamp(timestamp)) as duration_seconds
          FROM (
            SELECT 
              session_id,
              page_path,
              timestamp
            FROM events
            WHERE 
              site_id = {siteId:String}
              AND ${dateFilter}
              AND event_type = 'page_view'
            ORDER BY session_id, timestamp
          )
          GROUP BY session_id
          HAVING length(path) >= 2
          LIMIT 1000
        `;

                const result = await clickhouse.query({
                    query: pathsQuery,
                    query_params: { siteId },
                    format: 'JSONEachRow',
                });

                interface SessionPathRow {
                    session_id: string;
                    path: string[];
                    page_views: string;
                    duration_seconds: number;
                }

                const rawData = await result.json();
                const sessionPaths = rawData as SessionPathRow[];

                // Aggregate into path transitions (for Sankey)
                const transitions = new Map<string, number>();
                const pathCounts = new Map<string, { count: number; totalDuration: number }>();

                for (const session of sessionPaths) {
                    const path = session.path;
                    const pathKey = path.slice(0, 5).join(' → '); // Limit to first 5 pages

                    const existing = pathCounts.get(pathKey) || { count: 0, totalDuration: 0 };
                    pathCounts.set(pathKey, {
                        count: existing.count + 1,
                        totalDuration: existing.totalDuration + session.duration_seconds,
                    });

                    // Count transitions
                    for (let i = 0; i < path.length - 1; i++) {
                        const transitionKey = `${path[i]}|||${path[i + 1]}`;
                        transitions.set(transitionKey, (transitions.get(transitionKey) || 0) + 1);
                    }
                }

                // Convert to Sankey format
                const nodes: PathNode[] = [];
                for (const [key, value] of transitions.entries()) {
                    if (value >= 2) { // Only include transitions with at least 2 occurrences
                        const [source, target] = key.split('|||');
                        nodes.push({ source, target, value });
                    }
                }

                // Sort and limit
                nodes.sort((a, b) => b.value - a.value);
                const topNodes = nodes.slice(0, Math.min(limit, 200));

                // Get top paths
                const topPaths: JourneyPath[] = [];
                for (const [path, data] of pathCounts.entries()) {
                    topPaths.push({
                        path: path.split(' → '),
                        count: data.count,
                        avgDuration: Math.round(data.totalDuration / data.count),
                    });
                }
                topPaths.sort((a, b) => b.count - a.count);

                // Calculate entry and exit pages
                const entryPages = new Map<string, number>();
                const exitPages = new Map<string, number>();

                for (const session of sessionPaths) {
                    const path = session.path;
                    if (path.length > 0) {
                        entryPages.set(path[0], (entryPages.get(path[0]) || 0) + 1);
                        exitPages.set(path[path.length - 1], (exitPages.get(path[path.length - 1]) || 0) + 1);
                    }
                }

                const topEntryPages = Array.from(entryPages.entries())
                    .map(([page, count]) => ({ page, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                const topExitPages = Array.from(exitPages.entries())
                    .map(([page, count]) => ({ page, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);

                return {
                    sankeyLinks: topNodes,
                    topPaths: topPaths.slice(0, 20),
                    entryPages: topEntryPages,
                    exitPages: topExitPages,
                    totalSessions: sessionPaths.length,
                };
            },
            300000 // 5 minute cache
        );

        return NextResponse.json(journeyData);
    } catch (error) {
        console.error('[user-journeys] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
