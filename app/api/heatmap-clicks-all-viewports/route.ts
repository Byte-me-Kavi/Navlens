// app/api/heatmap-clicks-all-viewports/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

import { getClickHouseClient } from '@/lib/clickhouse';

// Get the singleton ClickHouse client
const clickhouse = getClickHouseClient();

/**
 * POST handler - Fetch heatmap clicks from ALL viewport sizes (aggregated)
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateAndAuthorize(req);

    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const { siteId, pagePath, deviceType = 'desktop' } = body;

    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { message: 'Missing or invalid siteId parameter' },
        { status: 400 }
      );
    }

    if (!pagePath || typeof pagePath !== 'string') {
      return NextResponse.json(
        { message: 'Missing or invalid pagePath parameter' },
        { status: 400 }
      );
    }

    if (!validators.isValidUUID(siteId)) {
      return NextResponse.json(
        { message: 'Invalid siteId format' },
        { status: 400 }
      );
    }

    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    if (!validators.isValidPagePath(pagePath)) {
      return NextResponse.json(
        { message: 'Invalid pagePath format' },
        { status: 400 }
      );
    }

    const validDeviceTypes = ['desktop', 'tablet', 'mobile'];
    if (!validDeviceTypes.includes(deviceType)) {
      return NextResponse.json(
        { message: 'Invalid deviceType. Must be one of: desktop, tablet, mobile' },
        { status: 400 }
      );
    }

    console.log('[HEATMAP-ALL-VIEWPORTS] Fetching clicks for all viewport sizes');
    console.log('- siteId:', siteId);
    console.log('- pagePath:', pagePath);
    console.log('- deviceType:', deviceType);

    // Query for all clicks across ALL viewport sizes
    // We normalize coordinates to a common viewport (e.g., 1920x1080)
    const allViewportsQuery = `
      SELECT
        -- Normalize to standard viewport (1920x1080)
        round(x_relative * 1920, 2) as x,
        round(y_relative * 1080, 2) as y,
        x_relative,
        y_relative,
        1920 as document_width,
        1080 as document_height,
        sum(count) as value
      FROM (
        SELECT
          x_relative,
          y_relative,
          count(*) as count
        FROM events
        WHERE site_id = {siteId:String}
          AND page_path = {pagePath:String}
          AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
          AND event_type = 'click'
          AND timestamp >= subtractDays(now(), 30)
          AND x_relative > 0 AND y_relative > 0
          AND document_width > 0 AND document_height > 0
        GROUP BY x_relative, y_relative
      )
      GROUP BY x_relative, y_relative
      ORDER BY value DESC
      LIMIT 5000
    `;

    const result = await clickhouse.query({
      query: allViewportsQuery,
      query_params: {
        siteId,
        pagePath,
        deviceType,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();

    console.log(`[HEATMAP-ALL-VIEWPORTS] Returned ${rows.length} aggregated click points`);

    interface ClickRow {
      x: string;
      y: string;
      x_relative: string;
      y_relative: string;
      document_width: string;
      document_height: string;
      value: string;
    }

    const clicks = (rows as ClickRow[]).map((row) => ({
      x: parseFloat(row.x),
      y: parseFloat(row.y),
      x_relative: parseFloat(row.x_relative),
      y_relative: parseFloat(row.y_relative),
      document_width: parseInt(row.document_width),
      document_height: parseInt(row.document_height),
      value: parseInt(row.value),
    }));

    return NextResponse.json({ clicks }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HEATMAP-ALL-VIEWPORTS] Error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status: 500 }
    );
  }
}
