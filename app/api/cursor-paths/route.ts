import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';

const clickhouse = getClickHouseClient();

export async function POST(req: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath, sessionId, startDate, endDate, limit = 50 } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { error: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        try {
            // Simplified query using available click/scroll data
            const pathQuery = `
              SELECT 
                session_id,
                count() as event_count,
                max(scroll_depth) as max_scroll_depth,
                countIf(is_dead_click = true) as dead_clicks,
                min(timestamp) as first_event,
                max(timestamp) as last_event
              FROM events
              WHERE site_id = {siteId:String}
                AND page_path = {pagePath:String}
                AND timestamp >= {startDate:DateTime}
                AND timestamp <= {endDate:DateTime}
                ${sessionId ? 'AND session_id = {sessionId:String}' : ''}
              GROUP BY session_id
              HAVING event_count >= 1
              ORDER BY event_count DESC, dead_clicks DESC
              LIMIT {limit:Int32}
            `;

            const result = await clickhouse.query({
                query: pathQuery,
                query_params: { siteId, pagePath, startDate: start, endDate: end, sessionId: sessionId || '', limit },
                format: 'JSONEachRow'
            });

            const pathData = await result.json() as Array<{
                session_id: string;
                event_count: number;
                max_scroll_depth: number;
                dead_clicks: number;
                first_event: string;
                last_event: string;
            }>;

            // Calculate aggregate stats
            const totalSessions = pathData.length;
            const avgEventCount = totalSessions > 0
                ? pathData.reduce((sum, p) => sum + Number(p.event_count), 0) / totalSessions
                : 0;

            // Classify sessions by behavior pattern
            const sessionPatterns = pathData.map(p => {
                const eventCount = Number(p.event_count);
                const scrollDepth = Number(p.max_scroll_depth);
                const deadClicks = Number(p.dead_clicks);

                // Classify based on available data
                let pattern: 'focused' | 'exploring' | 'lost' | 'minimal';
                if (eventCount < 10) {
                    pattern = 'minimal';
                } else if (deadClicks > 2 || (scrollDepth > 80 && eventCount > 50)) {
                    pattern = 'lost';
                } else if (scrollDepth > 50 && deadClicks === 0) {
                    pattern = 'focused';
                } else {
                    pattern = 'exploring';
                }

                return {
                    sessionId: p.session_id,
                    totalDistance: eventCount * 100, // Estimated
                    directionChanges: Math.floor(eventCount / 3),
                    erraticSegments: deadClicks,
                    pathSegments: eventCount,
                    pattern,
                    directnessScore: deadClicks > 0 ? 0.5 : 0.8,
                    duration: new Date(p.last_event).getTime() - new Date(p.first_event).getTime(),
                };
            });

            // Pattern breakdown
            const patternBreakdown = {
                focused: sessionPatterns.filter(s => s.pattern === 'focused').length,
                exploring: sessionPatterns.filter(s => s.pattern === 'exploring').length,
                lost: sessionPatterns.filter(s => s.pattern === 'lost').length,
                minimal: sessionPatterns.filter(s => s.pattern === 'minimal').length,
            };

            return encryptedJsonResponse({
                totalSessions,
                avgDistance: Math.round(avgEventCount * 100),
                avgDirectionChanges: Math.round(avgEventCount / 3),
                erraticSessions: sessionPatterns.filter(s => s.erraticSegments > 0).length,
                erraticPercentage: totalSessions > 0
                    ? parseFloat((sessionPatterns.filter(s => s.erraticSegments > 0).length / totalSessions * 100).toFixed(1))
                    : 0,
                patternBreakdown,
                sessions: sessionPatterns,
                note: 'Derived from click/scroll patterns - add cursor tracking columns for true cursor paths',
            }, { status: 200 });
        } catch (queryError) {
            console.error('[cursor-paths] Query error:', queryError);
            // Return empty data on query error
            return encryptedJsonResponse({
                totalSessions: 0,
                avgDistance: 0,
                avgDirectionChanges: 0,
                erraticSessions: 0,
                erraticPercentage: 0,
                patternBreakdown: { focused: 0, exploring: 0, lost: 0, minimal: 0 },
                sessions: [],
                error: 'Data not available',
            }, { status: 200 });
        }
    } catch (error) {
        console.error('[cursor-paths] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
