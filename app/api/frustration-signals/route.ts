import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';
import { unstable_cache } from 'next/cache';

const clickhouse = getClickHouseClient();

// Cache frustration signals for 2 minutes
const getCachedFrustrationSignals = unstable_cache(
    async (siteId: string, pagePath: string, startDate: string, endDate: string) => {
        const query = `
      SELECT 
        session_id,
        -- Dead clicks
        countIf(event_type = 'dead_click') as dead_clicks,
        -- Rage clicks
        countIf(event_type = 'rage_click') as rage_clicks,
        -- Confusion scroll events
        countIf(event_type = 'confusion_scroll') as confusion_scrolls,
        avgIf(confusion_scroll_score, event_type = 'confusion_scroll') as avg_confusion_score,
        -- Erratic movements
        countIf(is_erratic_movement = true) as erratic_movements,
        avgIf(cursor_direction_changes, event_type = 'mouse_move') as avg_direction_changes,
        -- Aggregate metrics
        sum(cursor_path_distance) as total_cursor_distance,
        sum(hover_duration_ms) as total_hover_time_ms,
        -- Session frustration score (weighted sum)
        (
          countIf(event_type = 'dead_click') * 2 +
          countIf(event_type = 'rage_click') * 3 +
          countIf(event_type = 'confusion_scroll') * 2 +
          countIf(is_erratic_movement = true) * 1
        ) as frustration_score
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
      GROUP BY session_id
      HAVING frustration_score > 0
      ORDER BY frustration_score DESC
      LIMIT 100
    `;

        const result = await clickhouse.query({
            query,
            query_params: { siteId, pagePath, startDate, endDate },
            format: 'JSONEachRow'
        });

        const sessions = await result.json() as Array<{
            session_id: string;
            dead_clicks: number;
            rage_clicks: number;
            confusion_scrolls: number;
            avg_confusion_score: number;
            erratic_movements: number;
            avg_direction_changes: number;
            total_cursor_distance: number;
            total_hover_time_ms: number;
            frustration_score: number;
        }>;

        // Calculate aggregate stats
        const totalSessions = sessions.length;
        const totalFrustrationScore = sessions.reduce((sum, s) => sum + s.frustration_score, 0);
        const avgFrustrationScore = totalSessions > 0 ? totalFrustrationScore / totalSessions : 0;

        // Group by frustration level
        const frustrationBreakdown = {
            low: sessions.filter(s => s.frustration_score <= 3).length,
            medium: sessions.filter(s => s.frustration_score > 3 && s.frustration_score <= 7).length,
            high: sessions.filter(s => s.frustration_score > 7).length,
        };

        // Signal type totals
        const signalTotals = {
            dead_clicks: sessions.reduce((sum, s) => sum + Number(s.dead_clicks), 0),
            rage_clicks: sessions.reduce((sum, s) => sum + Number(s.rage_clicks), 0),
            confusion_scrolls: sessions.reduce((sum, s) => sum + Number(s.confusion_scrolls), 0),
            erratic_movements: sessions.reduce((sum, s) => sum + Number(s.erratic_movements), 0),
        };

        return {
            totalSessions,
            avgFrustrationScore: parseFloat(avgFrustrationScore.toFixed(2)),
            frustrationBreakdown,
            signalTotals,
            topFrustratedSessions: sessions.slice(0, 10).map(s => ({
                sessionId: s.session_id,
                frustrationScore: s.frustration_score,
                deadClicks: Number(s.dead_clicks),
                rageClicks: Number(s.rage_clicks),
                confusionScrolls: Number(s.confusion_scrolls),
                erraticMovements: Number(s.erratic_movements),
            })),
        };
    },
    ['frustration-signals'],
    { revalidate: 120 } // 2 minutes
);

export async function POST(req: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath, startDate, endDate } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { error: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        // Default to last 7 days
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        const data = await getCachedFrustrationSignals(siteId, pagePath, start, end);

        return encryptedJsonResponse(data, { status: 200 });
    } catch (error) {
        console.error('[frustration-signals] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
