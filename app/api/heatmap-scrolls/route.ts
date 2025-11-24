// app/api/heatmap-scrolls/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

const client = createClient({
  url: process.env.CLICKHOUSE_URL,
  host: process.env.CLICKHOUSE_HOST,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  database: process.env.CLICKHOUSE_DATABASE,
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateAndAuthorize(req);
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const { siteId, pagePath, deviceType, startDate: rawStartDate, endDate: rawEndDate } = body;

    if (!siteId || !pagePath || !deviceType) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }
    
    const endDate = rawEndDate ? new Date(rawEndDate) : new Date();
    const startDate = rawStartDate ? new Date(rawStartDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const query_params = {
      siteId,
      pagePath,
      deviceType,
      startDate: startDate.toISOString().slice(0, 19).replace('T', ' '),
      endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),
    };

    console.log('🔍 Heatmap-scrolls API called with params:', query_params);

    const totalSessionsQuery = `
      SELECT uniq(session_id) as total_sessions
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
        AND scroll_depth IS NOT NULL
    `;

    // Optimized Query: Fetches everything in ONE scan
    // We calculate the "Max Seen Percentage" per session
    const histogramQuery = `
      SELECT 
          -- Bucket into 1% increments (0 to 100)
          floor(max_visible_pct) as bucket,
          count() as sessions
      FROM
      (
          SELECT 
              session_id,
              
              -- CALCULATE TRUE VISIBILITY:
              -- scroll_depth is usually scrollTop / (docHeight - viewHeight).
              -- We want (scrollTop + viewHeight) / docHeight.
              max(
                  CASE 
                      WHEN document_height > 0 AND viewport_height > 0 THEN
                         -- Convert relative scroll to pixels, add viewport, divide by total doc height
                         ( (scroll_depth * (document_height - viewport_height)) + viewport_height ) / document_height * 100
                      ELSE 
                         -- Fallback if DOM data missing: just use raw scroll_depth + 10% buffer for fold
                         (scroll_depth * 100) + 10
                  END
              ) as max_visible_pct
              
          FROM events
          WHERE site_id = {siteId:String}
            AND page_path = {pagePath:String}
            AND device_type = {deviceType:String}
            AND timestamp >= {startDate:DateTime}
            AND timestamp <= {endDate:DateTime}
            AND scroll_depth IS NOT NULL
          GROUP BY session_id
      )
      -- Filter out bad data (e.g. > 100% due to bounce effect)
      WHERE bucket >= 0 AND bucket <= 100
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const [totalSessionsResult, histogramResult] = await Promise.all([
      client.query({ query: totalSessionsQuery, query_params, format: 'JSONEachRow' }),
      client.query({ query: histogramQuery, query_params, format: 'JSONEachRow' }),
    ]);

    const totalSessionsData = await totalSessionsResult.json() as Array<{ total_sessions: number }>;
    const histogramData = await histogramResult.json() as Array<{ bucket: number; sessions: number }>;

    console.log('📊 ClickHouse totalSessionsData:', totalSessionsData);
    console.log('📊 ClickHouse histogramData:', histogramData);

    const totalSessions = totalSessionsData[0]?.total_sessions || 0;

    // --- POST-PROCESSING (Node.js side) ---
    // ClickHouse gives us: "5 people stopped at 20%, 3 people stopped at 21%"
    // We need Cumulative: "How many people reached 20%?" (Answer: Everyone who stopped at 20, 21, 22... 100)

    // 1. Create array of 0-100
    const buckets = new Array(101).fill(0);
    histogramData.forEach(row => {
      // If bucket is 50, it means they stopped at 50%
      if (row.bucket >= 0 && row.bucket <= 100) {
          buckets[row.bucket] = Number(row.sessions);
      }
    });

    // 2. Calculate Cumulative Retention (Iterate backwards)
    // "People at 99%" = "People who stopped at 99%" + "People who stopped at 100%"
    const resultData = [];
    let runningTotal = 0;

    for (let i = 100; i >= 0; i--) {
        runningTotal += Number(buckets[i]);
        
        // Only add data points every 1% or 5% to keep payload small
        // or send all 100 points for super smooth gradients
        resultData.push({
            scroll_percentage: i,
            sessions: runningTotal // This is now a NUMBER, solving your frontend bug
        });
    }

    // Reverse back to 0 -> 100 for the frontend
    resultData.reverse();

    return NextResponse.json({
      totalSessions,
      scrollData: resultData,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error fetching scroll heatmap data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Failed to fetch scroll heatmap data', error: errorMessage }, { status: 500 });
  }
}
