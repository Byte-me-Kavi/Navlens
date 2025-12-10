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

        // Get cursor path metrics per session
        const pathQuery = `
      SELECT 
        session_id,
        sum(cursor_path_distance) as total_distance,
        sum(cursor_direction_changes) as total_direction_changes,
        countIf(is_erratic_movement = true) as erratic_segments,
        count() as path_segments,
        min(timestamp) as first_event,
        max(timestamp) as last_event
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
        AND event_type = 'mouse_move'
        ${sessionId ? 'AND session_id = {sessionId:String}' : ''}
      GROUP BY session_id
      HAVING total_distance > 0
      ORDER BY erratic_segments DESC, total_direction_changes DESC
      LIMIT {limit:Int32}
    `;

        const result = await clickhouse.query({
            query: pathQuery,
            query_params: { siteId, pagePath, startDate: start, endDate: end, sessionId: sessionId || '', limit },
            format: 'JSONEachRow'
        });

        const pathData = await result.json() as Array<{
            session_id: string;
            total_distance: number;
            total_direction_changes: number;
            erratic_segments: number;
            path_segments: number;
            first_event: string;
            last_event: string;
        }>;

        // Calculate aggregate stats
        const totalSessions = pathData.length;
        const avgDistance = totalSessions > 0
            ? pathData.reduce((sum, p) => sum + Number(p.total_distance), 0) / totalSessions
            : 0;
        const avgDirectionChanges = totalSessions > 0
            ? pathData.reduce((sum, p) => sum + Number(p.total_direction_changes), 0) / totalSessions
            : 0;
        const erraticSessions = pathData.filter(p => Number(p.erratic_segments) > 0).length;

        // Classify sessions by movement pattern
        const sessionPatterns = pathData.map(p => {
            const distance = Number(p.total_distance);
            const directionChanges = Number(p.total_direction_changes);
            const segments = Number(p.path_segments);
            const erratic = Number(p.erratic_segments);

            // Calculate movement pattern
            const directness = segments > 0 && directionChanges > 0
                ? 1 - (directionChanges / (distance / 10))
                : 1;

            let pattern: 'focused' | 'exploring' | 'lost' | 'minimal';
            if (distance < 500) {
                pattern = 'minimal';
            } else if (directness > 0.7 && erratic === 0) {
                pattern = 'focused';
            } else if (erratic > 2 || directness < 0.3) {
                pattern = 'lost';
            } else {
                pattern = 'exploring';
            }

            return {
                sessionId: p.session_id,
                totalDistance: Math.round(distance),
                directionChanges: directionChanges,
                erraticSegments: erratic,
                pathSegments: segments,
                pattern,
                directnessScore: parseFloat(Math.max(0, directness).toFixed(2)),
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
            avgDistance: Math.round(avgDistance),
            avgDirectionChanges: Math.round(avgDirectionChanges),
            erraticSessions,
            erraticPercentage: totalSessions > 0 ? parseFloat((erraticSessions / totalSessions * 100).toFixed(1)) : 0,
            patternBreakdown,
            sessions: sessionPatterns,
        }, { status: 200 });
    } catch (error) {
        console.error('[cursor-paths] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
