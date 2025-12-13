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

                try {
                    // Simple query - get page views by session
                    const simpleQuery = `
                        SELECT 
                            session_id,
                            page_path,
                            count() as visits
                        FROM events
                        WHERE 
                            site_id = {siteId:String}
                            AND ${dateFilter}
                            AND page_path IS NOT NULL
                            AND page_path != ''
                        GROUP BY session_id, page_path
                        ORDER BY session_id, visits DESC
                        LIMIT 5000
                    `;

                    const result = await clickhouse.query({
                        query: simpleQuery,
                        query_params: { siteId },
                        format: 'JSONEachRow',
                    });

                    interface PageViewRow {
                        session_id: string;
                        page_path: string;
                        visits: string;
                    }

                    const rawData = await result.json();
                    const pageViews = rawData as PageViewRow[];

                    // Group by session to build paths
                    const sessionPages = new Map<string, string[]>();
                    for (const row of pageViews) {
                        const pages = sessionPages.get(row.session_id) || [];
                        pages.push(row.page_path);
                        sessionPages.set(row.session_id, pages);
                    }

                    // Build transitions
                    const transitions = new Map<string, number>();
                    const pathCounts = new Map<string, number>();
                    const entryPages = new Map<string, number>();
                    const exitPages = new Map<string, number>();

                    for (const [, pages] of sessionPages.entries()) {
                        if (pages.length >= 2) {
                            // Count path
                            const pathKey = pages.slice(0, 5).join(' → ');
                            pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);

                            // Count transitions
                            for (let i = 0; i < pages.length - 1; i++) {
                                const key = `${pages[i]}|||${pages[i + 1]}`;
                                transitions.set(key, (transitions.get(key) || 0) + 1);
                            }
                        }

                        // Entry & exit
                        if (pages.length > 0) {
                            entryPages.set(pages[0], (entryPages.get(pages[0]) || 0) + 1);
                            exitPages.set(pages[pages.length - 1], (exitPages.get(pages[pages.length - 1]) || 0) + 1);
                        }
                    }

                    // Build response
                    const sankeyLinks = Array.from(transitions.entries())
                        .filter(([, v]) => v >= 2)
                        .map(([k, v]) => {
                            const [source, target] = k.split('|||');
                            return { source, target, value: v };
                        })
                        .sort((a, b) => b.value - a.value)
                        .slice(0, limit);

                    const topPaths = Array.from(pathCounts.entries())
                        .map(([path, count]) => ({
                            path: path.split(' → '),
                            count,
                            avgDuration: 0,
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 20);

                    const topEntry = Array.from(entryPages.entries())
                        .map(([page, count]) => ({ page, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 10);

                    const topExit = Array.from(exitPages.entries())
                        .map(([page, count]) => ({ page, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 10);

                    return {
                        sankeyLinks,
                        topPaths,
                        entryPages: topEntry,
                        exitPages: topExit,
                        totalSessions: sessionPages.size,
                    };
                } catch (queryError) {
                    console.error('[user-journeys] Query error:', queryError);
                    return {
                        sankeyLinks: [],
                        topPaths: [],
                        entryPages: [],
                        exitPages: [],
                        totalSessions: 0,
                    };
                }
            },
            300000 // 5 minute cache
        );

        return NextResponse.json(journeyData);
    } catch (error) {
        console.error('[user-journeys] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
