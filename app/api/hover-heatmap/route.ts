import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';
import { unstable_cache } from 'next/cache';

const clickhouse = getClickHouseClient();

// Cache hover heatmap data for 5 minutes
const getCachedHoverHeatmap = unstable_cache(
    async (siteId: string, pagePath: string, deviceType: string, startDate: string, endDate: string) => {
        // Get hover events with element positions
        const hoverQuery = `
      SELECT 
        element_selector,
        element_tag,
        attention_zone,
        sum(hover_duration_ms) as total_hover_duration_ms,
        count() as hover_count,
        avg(hover_duration_ms) as avg_hover_duration_ms,
        avg(x_relative) as x_relative,
        avg(y_relative) as y_relative
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
        AND event_type = 'hover'
        AND hover_duration_ms > 0
      GROUP BY element_selector, element_tag, attention_zone
      ORDER BY total_hover_duration_ms DESC
      LIMIT 100
    `;

        // Get attention zone summary
        const zoneQuery = `
      SELECT 
        attention_zone,
        sum(hover_duration_ms) as total_time_ms,
        count() as event_count,
        uniq(session_id) as unique_sessions
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
        AND event_type IN ('hover', 'mouse_move')
        AND attention_zone != ''
      GROUP BY attention_zone
      ORDER BY total_time_ms DESC
    `;

        const [hoverResult, zoneResult] = await Promise.all([
            clickhouse.query({
                query: hoverQuery,
                query_params: { siteId, pagePath, deviceType, startDate, endDate },
                format: 'JSONEachRow'
            }),
            clickhouse.query({
                query: zoneQuery,
                query_params: { siteId, pagePath, deviceType, startDate, endDate },
                format: 'JSONEachRow'
            })
        ]);

        const hoverData = await hoverResult.json() as Array<{
            element_selector: string;
            element_tag: string;
            attention_zone: string;
            total_hover_duration_ms: number;
            hover_count: number;
            avg_hover_duration_ms: number;
            x_relative: number;
            y_relative: number;
        }>;

        const zoneData = await zoneResult.json() as Array<{
            attention_zone: string;
            total_time_ms: number;
            event_count: number;
            unique_sessions: number;
        }>;

        // Calculate total hover time for percentage calculations
        const totalHoverTime = hoverData.reduce((sum, h) => sum + Number(h.total_hover_duration_ms), 0);

        // Transform hover data for heatmap
        const heatmapPoints = hoverData.map(h => ({
            selector: h.element_selector,
            tag: h.element_tag,
            zone: h.attention_zone,
            duration: Number(h.total_hover_duration_ms),
            count: Number(h.hover_count),
            avgDuration: Math.round(Number(h.avg_hover_duration_ms)),
            x: parseFloat(Number(h.x_relative).toFixed(4)),
            y: parseFloat(Number(h.y_relative).toFixed(4)),
            intensity: totalHoverTime > 0 ? parseFloat((Number(h.total_hover_duration_ms) / totalHoverTime).toFixed(4)) : 0,
        }));

        // Transform zone data
        const attentionZones = zoneData.map(z => ({
            zone: z.attention_zone,
            totalTimeMs: Number(z.total_time_ms),
            eventCount: Number(z.event_count),
            uniqueSessions: Number(z.unique_sessions),
            percentage: totalHoverTime > 0 ? parseFloat((Number(z.total_time_ms) / totalHoverTime * 100).toFixed(1)) : 0,
        }));

        return {
            totalHoverTimeMs: totalHoverTime,
            heatmapPoints,
            attentionZones,
        };
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
