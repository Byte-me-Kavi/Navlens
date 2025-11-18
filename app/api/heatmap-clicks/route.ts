// app/api/heatmap-clicks/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

// Initialize ClickHouse client - supports both Cloud (URL) and local (host-based) setups
const client = (() => {
  const url = process.env.CLICKHOUSE_URL;
  
  if (url) {
    // Production: Use full URL for ClickHouse Cloud (https://user:pass@host:8443/database)
    console.log('[heatmap-clicks] Initializing ClickHouse Cloud client');
    return createClient({ url });
  } else {
    // Development: Use host-based configuration for local ClickHouse
    console.log('[heatmap-clicks] Initializing local ClickHouse client');
    return createClient({
      url: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE,
    });
  }
})();

export async function POST(req: NextRequest) {
  try {
    // Authenticate user and get their authorized sites
    const authResult = await authenticateAndAuthorize(req);

    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();

    // Required parameters with validation
    const siteId = body.siteId;
    const pagePath = body.pagePath;
    const deviceType = body.deviceType || 'desktop'; // Default to desktop
    const startDate = body.startDate;
    const endDate = body.endDate;

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

    // Optional date range parameters
    // Default to last 24 hours if no specific date range is provided
    const endDate = endDate ? new Date(endDate) : new Date();
    const startDate = startDate ? new Date(startDate) : new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // ClickHouse query for aggregated click data filtered by device type
    const query = `
      SELECT
          ROUND(x_relative, 5) AS x_relative,
          ROUND(y_relative, 5) AS y_relative,
          COUNT() AS count
      FROM
          events
      WHERE
          event_type = 'click'
          AND site_id = {siteId:String}
          AND page_path = {pagePath:String}
          AND device_type = {deviceType:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
      GROUP BY
          x_relative,
          y_relative
      HAVING
          count > 0
      ORDER BY
          count DESC;
    `;

    // Execute the query with parameterized values and timeout
    console.log('[heatmap-clicks] Executing query with timeout...');
    const resultSet = await Promise.race([
      client.query({
        query: query,
        query_params: {
          siteId: siteId,
          pagePath: pagePath,
          deviceType: deviceType,
          startDate: startDate.toISOString().slice(0, 19).replace('T', ' '), // Format for ClickHouse DateTime
          endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),     // Format for ClickHouse DateTime
        },
        format: 'JSON', // Request results in JSON format
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('ClickHouse query timeout after 25 seconds')), 25000)
      ),
    ]);

    const heatmapData = await (resultSet as unknown as { json: () => Promise<unknown> }).json(); // Get the JSON response

    console.log(`[heatmap-clicks] Query executed successfully for pagePath=${pagePath}, deviceType=${deviceType}`);

    return NextResponse.json(heatmapData, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status: 500 }
    );
  }
}