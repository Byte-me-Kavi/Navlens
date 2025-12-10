import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';
import { unstable_cache } from 'next/cache';

const clickhouse = getClickHouseClient();

// Cache frustration signals for 2 minutes
const getCachedFrustrationSignals = unstable_cache(
    async (siteId: string, pagePath: string, startDate: string, endDate: string) => {
        try {
            // Simplified query that works with basic columns
            const query = `
              SELECT 
                session_id,
                -- Dead clicks (using existing is_dead_click column)
                countIf(is_dead_click = true) as dead_clicks,
                -- Rage clicks (event_type = 'rage_click')
                countIf(event_type = 'rage_click') as rage_clicks,
                -- Click count for pattern analysis
                sum(click_count) as total_clicks
              FROM events
              WHERE site_id = {siteId:String}
                AND page_path = {pagePath:String}
                AND timestamp >= {startDate:DateTime}
                AND timestamp <= {endDate:DateTime}
              GROUP BY session_id
              HAVING dead_clicks > 0 OR rage_clicks > 0
              ORDER BY rage_clicks DESC, dead_clicks DESC
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
                total_clicks: number;
            }>;

            // Calculate aggregate stats
            const totalSessions = sessions.length;
            const totalDeadClicks = sessions.reduce((sum, s) => sum + Number(s.dead_clicks), 0);
            const totalRageClicks = sessions.reduce((sum, s) => sum + Number(s.rage_clicks), 0);

            // Simple frustration score based on available data
            const avgFrustrationScore = totalSessions > 0
                ? (totalDeadClicks * 2 + totalRageClicks * 3) / totalSessions
                : 0;

            // Group by frustration level
            const frustrationBreakdown = {
                low: sessions.filter(s => (Number(s.dead_clicks) * 2 + Number(s.rage_clicks) * 3) <= 3).length,
                medium: sessions.filter(s => {
                    const score = Number(s.dead_clicks) * 2 + Number(s.rage_clicks) * 3;
                    return score > 3 && score <= 7;
                }).length,
                high: sessions.filter(s => (Number(s.dead_clicks) * 2 + Number(s.rage_clicks) * 3) > 7).length,
            };

            // Signal type totals
            const signalTotals = {
                dead_clicks: totalDeadClicks,
                rage_clicks: totalRageClicks,
                confusion_scrolls: 0, // Not available without new columns
                erratic_movements: 0, // Not available without new columns
            };

            return {
                totalSessions,
                avgFrustrationScore: parseFloat(avgFrustrationScore.toFixed(2)),
                frustrationBreakdown,
                signalTotals,
                topFrustratedSessions: sessions.slice(0, 10).map(s => ({
                    sessionId: s.session_id,
                    frustrationScore: Number(s.dead_clicks) * 2 + Number(s.rage_clicks) * 3,
                    deadClicks: Number(s.dead_clicks),
                    rageClicks: Number(s.rage_clicks),
                    confusionScrolls: 0,
                    erraticMovements: 0,
                })),
            };
        } catch (error) {
            console.error('[frustration-signals] Query error:', error);
            // Return empty data on error
            return {
                totalSessions: 0,
                avgFrustrationScore: 0,
                frustrationBreakdown: { low: 0, medium: 0, high: 0 },
                signalTotals: { dead_clicks: 0, rage_clicks: 0, confusion_scrolls: 0, erratic_movements: 0 },
                topFrustratedSessions: [],
                error: 'Data not available - columns may need to be added to ClickHouse',
            };
        }
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
