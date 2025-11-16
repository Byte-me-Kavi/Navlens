// app/api/heatmap-clicks/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

// Initialize ClickHouse client (re-use the same client instance if possible for efficiency)
const client = createClient({
  host: process.env.CLICKHOUSE_HOST || 'localhost',
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

    // ClickHouse query for aggregated click data
    const query = `
      SELECT
          ROUND(x_relative * 100) AS x_bin,
          ROUND(y_relative * 100) AS y_bin,
          COUNT() AS count
      FROM
          events
      WHERE
          event_type = 'click'
          AND site_id = {siteId:String}
          AND page_path = {pagePath:String}
          AND timestamp >= {startDate:DateTime}
          AND timestamp <= {endDate:DateTime}
      GROUP BY
          x_bin,
          y_bin
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
        startDate: startDate.toISOString().slice(0, 19).replace('T', ' '), // Format for ClickHouse DateTime
        endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),     // Format for ClickHouse DateTime
      },
      format: 'JSON', // Request results in JSON format
    });

    const heatmapData = await resultSet.json(); // Get the JSON response

    return NextResponse.json(heatmapData, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: error.message },
      { status: 500 }
    );
  }
}