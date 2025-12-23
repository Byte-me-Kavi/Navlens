import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthenticatedResponse, createUnauthorizedResponse } from '@/lib/auth';

/**
 * POST /api/page-sessions
 * Returns the count of unique sessions for a specific page
 */
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

        // Check site authorization
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        const clickhouse = getClickHouseClient();

        // Calculate date range (default: last 30 days)
        const now = new Date();
        const endDateStr = endDate || now.toISOString();
        const startDateStr = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Query unique sessions for this page
        const query = `
      SELECT 
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(*) as total_events
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        AND timestamp >= parseDateTimeBestEffort({startDate:String})
        AND timestamp <= parseDateTimeBestEffort({endDate:String})
    `;

        const result = await clickhouse.query({
            query,
            query_params: {
                siteId,
                pagePath,
                deviceType,
                startDate: startDateStr,
                endDate: endDateStr
            },
            format: 'JSONEachRow'
        });

        const rows = await result.json() as Array<{ unique_sessions: string; total_events: string }>;
        const data = rows[0] || { unique_sessions: '0', total_events: '0' };

        return NextResponse.json({
            sessions: parseInt(data.unique_sessions, 10),
            totalEvents: parseInt(data.total_events, 10)
        });

    } catch (error: unknown) {
        console.error('[page-sessions] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch session count' },
            { status: 500 }
        );
    }
}
