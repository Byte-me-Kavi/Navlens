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

                // Build date filter - use 90 days by default
                let dateFilter = 'timestamp > now() - INTERVAL 90 DAY';
                if (startDate && endDate) {
                    // Convert ISO dates to YYYY-MM-DD HH:MM:SS format for ClickHouse
                    const formatDate = (d: string) => d.replace('T', ' ').replace('Z', '').split('.')[0];
                    dateFilter = `timestamp BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'`;
                }

                console.log('[user-journeys] Using date filter:', dateFilter);

                try {
                    // Optimized query - fetch events with timestamps to reconstruct journeys correctly
                    const query = `
                        SELECT 
                            session_id,
                            page_path,
                            timestamp
                        FROM events
                        WHERE 
                            site_id = {siteId:String}
                            AND ${dateFilter}
                            AND page_path IS NOT NULL
                            AND page_path != ''
                        ORDER BY session_id, timestamp ASC
                        LIMIT 10000
                    `;

                    const result = await clickhouse.query({
                        query: query,
                        query_params: { siteId },
                        format: 'JSONEachRow',
                    });

                    interface EventRow {
                        session_id: string;
                        page_path: string;
                        timestamp: string;
                    }

                    const rawData = await result.json();
                    const events = rawData as EventRow[];

                    console.log('[user-journeys] Raw event count:', events.length);

                    // Group by session to build paths and calculate durations
                    const sessionPaths = new Map<string, { paths: string[], startTime: number, endTime: number }>();

                    for (const row of events) {
                        const time = new Date(row.timestamp).getTime();

                        if (!sessionPaths.has(row.session_id)) {
                            sessionPaths.set(row.session_id, {
                                paths: [row.page_path],
                                startTime: time,
                                endTime: time
                            });
                        } else {
                            const session = sessionPaths.get(row.session_id)!;
                            // Only add if different from last page (deduplicate consecutive refreshes)
                            if (session.paths[session.paths.length - 1] !== row.page_path) {
                                session.paths.push(row.page_path);
                            }
                            session.endTime = Math.max(session.endTime, time);
                        }
                    }

                    console.log('[user-journeys] Unique sessions:', sessionPaths.size);

                    // Build transitions and path statistics
                    const pathStats = new Map<string, { count: number, totalDuration: number, path: string[] }>();
                    const entryPages = new Map<string, number>();
                    const exitPages = new Map<string, number>();

                    for (const [, data] of sessionPaths.entries()) {
                        const { paths, startTime, endTime } = data;

                        // Need at least 2 pages for a valid "journey" context usually, 
                        // but we can track single page visits too for entry/exit stats.

                        // Capture Entry & Exit
                        if (paths.length > 0) {
                            entryPages.set(paths[0], (entryPages.get(paths[0]) || 0) + 1);
                            exitPages.set(paths[paths.length - 1], (exitPages.get(paths[paths.length - 1]) || 0) + 1);
                        }

                        // Path Analysis (limit to 5 steps for readability)
                        // This identifies unique full journeys (up to 5 steps)
                        const truncatedPath = paths.slice(0, 5);
                        const pathString = truncatedPath.join(' → ');
                        const currentStats = pathStats.get(pathString) || { count: 0, totalDuration: 0, path: truncatedPath };

                        currentStats.count++;
                        currentStats.totalDuration += (endTime - startTime) / 1000; // seconds
                        pathStats.set(pathString, currentStats);
                    }

                    // Identify Top Paths first
                    const topPathsList = Array.from(pathStats.entries())
                        .map(([pathStr, stats]) => ({
                            path: stats.path,
                            count: stats.count,
                            avgDuration: Math.round(stats.totalDuration / stats.count),
                            pathString: pathStr
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 20); // Top 20 common paths

                    // Build Sankey transitions exclusively from the Top Paths
                    // This ensures the diagram visualizes the "Top Unique Paths" as requested
                    const transitions = new Map<string, number>();

                    for (const journey of topPathsList) {
                        const p = journey.path;
                        if (p.length < 2) continue;

                        for (let i = 0; i < p.length - 1; i++) {
                            // Add step index to node keys to ensure DAG
                            const source = `${i}__${p[i]}`;
                            const target = `${i + 1}__${p[i + 1]}`;
                            const key = `${source}|||${target}`;

                            // Add the count of this entire path to the link weight
                            // If 50 people took this exact path, this link gets +50 weight
                            transitions.set(key, (transitions.get(key) || 0) + journey.count);
                        }
                    }

                    // Build response objects
                    const sankeyLinks = Array.from(transitions.entries())
                        // We actuall keep all transitions from the top paths, 
                        // as they are already filtered by virtue of being top paths
                        .map(([k, v]) => {
                            const [source, target] = k.split('|||');
                            return { source, target, value: v };
                        })
                        .sort((a, b) => b.value - a.value);

                    const topPathsResponse = topPathsList.map(p => ({
                        path: p.path,
                        count: p.count,
                        avgDuration: p.avgDuration
                    }));

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
                        topPaths: topPathsResponse,
                        entryPages: topEntry,
                        exitPages: topExit,
                        totalSessions: sessionPaths.size,
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
