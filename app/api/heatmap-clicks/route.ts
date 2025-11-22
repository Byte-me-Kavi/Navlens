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

    console.log('Query parameters:');
    console.log('- siteId:', siteId, 'type:', typeof siteId);
    console.log('- pagePath:', pagePath, 'type:', typeof pagePath);
    console.log('- deviceType:', deviceType, 'type:', typeof deviceType);

    // Query for all click points using relative positioning for accurate remapping
    const allClicksQuery = `
      SELECT
        -- Use relative coordinates and store original document dimensions
        x_relative,
        y_relative,
        document_width,
        document_height,
        count(*) as value
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
        AND event_type = 'click'
        AND timestamp >= subtractDays(now(), 30)
        AND x_relative > 0 AND y_relative > 0
      GROUP BY x_relative, y_relative, document_width, document_height
      ORDER BY value DESC
      LIMIT 5000
    `;

    console.log('Query parameters:');
    console.log('- siteId:', siteId, 'type:', typeof siteId);
    console.log('- pagePath:', pagePath, 'type:', typeof pagePath);
    console.log('- deviceType:', deviceType, 'type:', typeof deviceType);

    console.log('=== RAW QUERIES BEFORE PARAMETER SUBSTITUTION ===');
    console.log('All Clicks Query Template:', allClicksQuery);
    console.log('Parameters:', { siteId, pagePath, deviceType });

    // Manually substitute parameters for logging
    const substitutedAllClicksQuery = allClicksQuery
      .replace(/{siteId}/g, `'${siteId}'`)
      .replace(/{pagePath}/g, `'${pagePath}'`)
      .replace(/{deviceType}/g, `'${deviceType}'`);

    console.log('=== FINAL QUERIES AFTER PARAMETER SUBSTITUTION ===');
    console.log('All Clicks Query (substituted):', substitutedAllClicksQuery);

    // Execute all clicks query
    console.log('🚀 EXECUTING ALL CLICKS QUERY...');
    const allClicksResult = await clickhouse.query({
      query: allClicksQuery,
      query_params: {
        siteId,
        pagePath,
        deviceType,
      },
      format: 'JSONEachRow',
    });

    const allClicksRows = await allClicksResult.json();

    console.log('ClickHouse returned', allClicksRows.length, 'all click points');

    // Transform all click points using relative coordinates
    // The viewer will use these relative positions to scale to current document dimensions
    interface ClickRow {
      x_relative: string;
      y_relative: string;
      document_width: string;
      document_height: string;
      value: string;
    }
    const clickPoints = (allClicksRows as ClickRow[]).map((row) => ({
      x_relative: parseFloat(row.x_relative),
      y_relative: parseFloat(row.y_relative),
      document_width: parseInt(row.document_width),
      document_height: parseInt(row.document_height),
      value: parseInt(row.value),
    }));

    console.log('Returning', clickPoints.length, 'click points with relative positioning');
    return NextResponse.json({
      clicks: clickPoints
    }, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status: 500 }
    );
  }
}