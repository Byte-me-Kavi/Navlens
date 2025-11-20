// app/api/heatmap-clicks/route.ts

import { createClient as createClickHouseClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

// Initialize ClickHouse client
function createClickHouseConfig() {
  const url = process.env.CLICKHOUSE_URL;
  if (url) {
    // Parse ClickHouse URL: https://username:password@host:port/database
    const urlPattern = /^https?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(urlPattern);
    if (match) {
      const [, username, password, host, port, database] = match;
      return {
        host: `https://${host}:${port}`,
        username,
        password,
        database,
      };
    }
  }

  // Fallback to individual env vars
  return {
    host: process.env.CLICKHOUSE_HOST!,
    username: process.env.CLICKHOUSE_USERNAME!,
    password: process.env.CLICKHOUSE_PASSWORD!,
    database: process.env.CLICKHOUSE_DATABASE!,
  };
}

const clickhouse = createClickHouseClient(createClickHouseConfig());

export async function GET(req: NextRequest) {
  try {
    // Authenticate user and get their authorized sites
    const authResult = await authenticateAndAuthorize(req);

    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');
    const pagePath = searchParams.get('pagePath');
    const deviceType = searchParams.get('deviceType') || 'desktop';

    // Validate required parameters
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

    // Validate siteId format (UUID)
    if (!validators.isValidUUID(siteId)) {
      return NextResponse.json(
        { message: 'Invalid siteId format' },
        { status: 400 }
      );
    }

    // Check if user is authorized for this site
    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    // Validate pagePath format
    if (!validators.isValidPagePath(pagePath)) {
      return NextResponse.json(
        { message: 'Invalid pagePath format' },
        { status: 400 }
      );
    }

    // Validate deviceType
    const validDeviceTypes = ['desktop', 'tablet', 'mobile'];
    if (!validDeviceTypes.includes(deviceType)) {
      return NextResponse.json(
        { message: 'Invalid deviceType. Must be one of: desktop, tablet, mobile' },
        { status: 400 }
      );
    }

    // Query ClickHouse for aggregated click data
    // Optimized query for heatmap click aggregation
    const query = `
      SELECT
        x,
        y,
        COUNT(*) as value
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
        AND event_type = 'click'
        AND timestamp >= now() - INTERVAL 30 DAY
        AND x > 0
        AND y > 0
      GROUP BY x, y
      ORDER BY value DESC
      LIMIT 1000
    `;

    console.log('Executing ClickHouse query for heatmap clicks');
    console.log('Query params:', { siteId, pagePath, deviceType });

    const result = await clickhouse.query({
      query,
      query_params: {
        siteId,
        pagePath,
        deviceType, // Keep for future use if needed
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    console.log('ClickHouse returned', rows.length, 'aggregated click points');

    // Transform to expected format
    interface ClickRow {
      x: string;
      y: string;
      value: string;
    }
    const clickPoints = (rows as ClickRow[]).map((row) => ({
      x: parseInt(row.x),
      y: parseInt(row.y),
      value: parseInt(row.value),
    }));

    console.log('Returning', clickPoints.length, 'click points to frontend');
    return NextResponse.json({ clicks: clickPoints }, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status: 500 }
    );
  }
}