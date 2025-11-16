// app/api/debug-clicks/route.ts
import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

const client = createClient({
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || 'a2a95f61-1024-40f8-af7e-4c4df2fcbd01';

    // First, check if there's ANY data at all
    const countQuery = `SELECT COUNT(*) as total_events, COUNT(DISTINCT event_type) as event_types FROM events WHERE site_id = {siteId:String}`;
    
    const countResult = await client.query({
      query: countQuery,
      query_params: { siteId },
      format: 'JSON',
    });
    const countData = await countResult.json();
    console.log('[debug-clicks] Total events count:', countData);

    // Check click-specific data
    const clicksQuery = `
      SELECT 
        site_id, 
        page_path, 
        event_type, 
        COUNT(*) as count,
        MIN(x_relative) as min_x,
        MAX(x_relative) as max_x,
        MIN(y_relative) as min_y,
        MAX(y_relative) as max_y
      FROM events 
      WHERE site_id = {siteId:String} AND event_type = 'click'
      GROUP BY site_id, page_path, event_type
      LIMIT 10
    `;

    const clicksResult = await client.query({
      query: clicksQuery,
      query_params: { siteId },
      format: 'JSON',
    });
    const clicksData = await clicksResult.json();
    console.log('[debug-clicks] Clicks summary:', clicksData);

    // Get sample raw click data
    const sampleQuery = `
      SELECT 
        site_id,
        page_path,
        x_relative,
        y_relative,
        timestamp
      FROM events 
      WHERE site_id = {siteId:String} AND event_type = 'click'
      LIMIT 5
    `;

    const sampleResult = await client.query({
      query: sampleQuery,
      query_params: { siteId },
      format: 'JSON',
    });
    const sampleData = await sampleResult.json();
    console.log('[debug-clicks] Sample raw clicks:', sampleData);

    return NextResponse.json({
      countData,
      clicksData,
      sampleData,
    });
  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[debug-clicks] Error:', error);
    return NextResponse.json(
      { message: 'Failed to debug clicks', error: errorMessage },
      { status: 500 }
    );
  }
}
