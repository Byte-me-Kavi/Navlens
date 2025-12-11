import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';
import { unstable_cache } from 'next/cache';

const clickhouse = getClickHouseClient();

// Cache hover heatmap data for 5 minutes
const getCachedHoverHeatmap = unstable_cache(
    async (siteId: string, pagePath: string, deviceType: string, startDate: string, endDate: string) => {
        try {
            // Query using available click data as attention proxy
            // Get both relative and absolute coordinates for fallback
            const clickQuery = `
              SELECT 
                element_selector,
                element_tag,
                count() as click_count,
                avg(x_relative) as x_relative,
                avg(y_relative) as y_relative,
                avg(x) as x_abs,
                avg(y) as y_abs,
                max(viewport_width) as viewport_width,
                max(viewport_height) as viewport_height
              FROM events
              WHERE site_id = {siteId:String}
                AND page_path = {pagePath:String}
                AND device_type = {deviceType:String}
                AND timestamp >= {startDate:DateTime}
                AND timestamp <= {endDate:DateTime}
                AND event_type = 'click'
              GROUP BY element_selector, element_tag
              ORDER BY click_count DESC
              LIMIT 100
            `;

            const result = await clickhouse.query({
                query: clickQuery,
                query_params: { siteId, pagePath, deviceType, startDate, endDate },
                format: 'JSONEachRow'
            });

            const clickData = await result.json() as Array<{
                element_selector: string;
                element_tag: string;
                click_count: number;
                x_relative: number;
                y_relative: number;
                x_abs: number;
                y_abs: number;
                viewport_width: number;
                viewport_height: number;
            }>;

            // Calculate total clicks for percentage calculations
            const totalClicks = clickData.reduce((sum, h) => sum + Number(h.click_count), 0);

            // Transform click data as attention heatmap (clicks = attention)
            const heatmapPoints = clickData.map(h => {
                // Use relative coordinates if available, otherwise calculate from absolute
                let xRel = Number(h.x_relative);
                let yRel = Number(h.y_relative);

                // If relative coords are 0 but we have absolute coords, calculate relative
                if ((xRel === 0 && yRel === 0) && (h.x_abs > 0 || h.y_abs > 0)) {
                    const vw = Number(h.viewport_width) || 1920;
                    const vh = Number(h.viewport_height) || 1080;
                    xRel = Number(h.x_abs) / vw;
                    yRel = Number(h.y_abs) / vh;
                }

                // Infer zone from y position
                let zone = 'content';
                if (yRel < 0.15) zone = 'heading';
                else if (yRel > 0.85) zone = 'footer';
                else if (yRel < 0.3) zone = 'interactive';

                return {
                    selector: h.element_selector,
                    tag: h.element_tag,
                    zone,
                    duration: Number(h.click_count) * 1000, // Simulate duration from clicks
                    count: Number(h.click_count),
                    avgDuration: 500,
                    x: parseFloat(xRel.toFixed(4)),
                    y: parseFloat(yRel.toFixed(4)),
                    intensity: totalClicks > 0 ? parseFloat((Number(h.click_count) / totalClicks).toFixed(4)) : 0,
                };
            });

            // Create attention zones from click patterns
            const zoneMap = new Map<string, { total: number; count: number; sessions: Set<string> }>();
            heatmapPoints.forEach(p => {
                const existing = zoneMap.get(p.zone) || { total: 0, count: 0, sessions: new Set() };
                existing.total += p.duration;
                existing.count += p.count;
                zoneMap.set(p.zone, existing);
            });

            const attentionZones = Array.from(zoneMap.entries()).map(([zone, data]) => ({
                zone,
                totalTimeMs: data.total,
                eventCount: data.count,
                uniqueSessions: 0,
                percentage: totalClicks > 0 ? parseFloat((data.count / totalClicks * 100).toFixed(1)) : 0,
            }));

            return {
                totalHoverTimeMs: totalClicks * 500,
                heatmapPoints,
                attentionZones,
                note: 'Derived from click data - add hover columns for true hover tracking',
            };
        } catch (error) {
            console.error('[hover-heatmap] Query error:', error);
            return {
                totalHoverTimeMs: 0,
                heatmapPoints: [],
                attentionZones: [],
                error: 'Data not available',
            };
        }
    },
    ['hover-heatmap'],
    { revalidate: 300 } // 5 minutes
);

export async function POST(req: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath, deviceType = 'desktop', startDate, endDate } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { error: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        const data = await getCachedHoverHeatmap(siteId, pagePath, deviceType, start, end);

        return encryptedJsonResponse(data, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        console.error('[hover-heatmap] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
