// app/api/element-clicks/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

// Initialize ClickHouse client - supports both Cloud (URL) and local (host-based) setups
const client = (() => {
  const url = process.env.CLICKHOUSE_URL;

  if (url) {
    // Production: Use full URL for ClickHouse Cloud (https://user:pass@host:8443/database)
    console.log('[element-clicks] Initializing ClickHouse Cloud client');
    return createClient({ url });
  } else {
    // Development: Use host-based configuration for local ClickHouse
    console.log('[element-clicks] Initializing local ClickHouse client');
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
    const { siteId, pagePath, deviceType = 'desktop', startDate: rawStartDate, endDate: rawEndDate } = body;

    if (!siteId || !pagePath) {
      return NextResponse.json(
        { message: 'Missing required parameters: siteId, pagePath' },
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

    // Optional date range parameters (now from request body)
    const endDate = rawEndDate ? new Date(rawEndDate) : new Date();
    const startDate = rawStartDate ? new Date(rawStartDate) : new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // ClickHouse query for aggregated click data by element_selector
    const query = `
      SELECT
          element_selector,
          COUNT() AS click_count
      FROM
          events
      WHERE
          event_type = 'click'
          AND site_id = {siteId:String}
          AND page_path = {pagePath:String}
          AND device_type = {deviceType:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
          AND element_selector IS NOT NULL
          AND element_selector != ''
      GROUP BY
          element_selector
      HAVING
          click_count > 0
      ORDER BY
          click_count DESC;
    `;

    // Execute the query with parameterized values
    const resultSet = await client.query({
      query: query,
      query_params: {
        siteId: siteId,
        pagePath: pagePath,
        deviceType: deviceType,
        startDate: startDate.toISOString().slice(0, 19).replace('T', ' '), // Format for ClickHouse DateTime
        endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),     // Format for ClickHouse DateTime
      },
      format: 'JSON', // Request results in JSON format
    });

    const elementClickData = await resultSet.json(); // Get the JSON response

    console.log(`[element-clicks] Query executed successfully for pagePath=${pagePath}, deviceType=${deviceType}`);

    return NextResponse.json(elementClickData, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching element click data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch element click data', error: errorMessage },
      { status: 500 }
    );
  }
}