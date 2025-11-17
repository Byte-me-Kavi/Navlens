// app/api/heatmap-clicks/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

// Initialize ClickHouse client (re-use the same client instance if possible for efficiency)
const client = createClient({
  url: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
});

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

    // ClickHouse query for aggregated click data filtered by device type
    const query = `
      SELECT
          ROUND(x_relative, 2) AS x_relative,
          ROUND(y_relative, 2) AS y_relative,
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

    const heatmapData = await resultSet.json(); // Get the JSON response

    console.log(`[heatmap-clicks] Query result for siteId=${siteId}, pagePath=${pagePath}, deviceType=${deviceType}:`, JSON.stringify(heatmapData));

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