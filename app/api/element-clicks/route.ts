// app/api/element-clicks/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Required parameters
    const siteId = searchParams.get('siteId');
    const pagePath = searchParams.get('pagePath');
    const deviceType = searchParams.get('deviceType') || 'desktop'; // Default to desktop

    if (!siteId || !pagePath) {
      return NextResponse.json(
        { message: 'Missing required parameters: siteId, pagePath' },
        { status: 400 }
      );
    }

    // Optional date range parameters
    const rawStartDate = searchParams.get('startDate');
    const rawEndDate = searchParams.get('endDate');

    // Default to last 24 hours if no specific date range is provided
    const endDate = rawEndDate ? new Date(rawEndDate) : new Date();
    const startDate = rawStartDate ? new Date(rawStartDate) : new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // ClickHouse query for aggregated click data by smart_selector
    const query = `
      SELECT
          smart_selector,
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
          AND smart_selector IS NOT NULL
          AND smart_selector != ''
      GROUP BY
          smart_selector
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

    console.log(`[element-clicks] Query result for siteId=${siteId}, pagePath=${pagePath}, deviceType=${deviceType}:`, JSON.stringify(elementClickData));

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