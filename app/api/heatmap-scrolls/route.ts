// app/api/heatmap-scrolls/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

import { getClickHouseClient } from '@/lib/clickhouse';

// Get the singleton ClickHouse client
const client = getClickHouseClient();

// Cached scroll data fetcher
const getCachedScrollData = unstable_cache(
  async (siteId: string, pagePath: string, deviceType: string, startDate: string, endDate: string) => {
    const query_params = { siteId, pagePath, deviceType, startDate, endDate };

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

    const histogramQuery = `
      SELECT 
          floor(max_visible_pct) as bucket,
          count() as sessions
      FROM
      (
          SELECT 
              session_id,
              max(
                  CASE 
                      WHEN document_height > 0 AND viewport_height > 0 THEN
                         ( (scroll_depth * (document_height - viewport_height)) + viewport_height ) / document_height * 100
                      ELSE 
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

    const totalSessions = totalSessionsData[0]?.total_sessions || 0;

    // Calculate Cumulative Retention
    const buckets = new Array(101).fill(0);
    histogramData.forEach(row => {
      if (row.bucket >= 0 && row.bucket <= 100) {
        buckets[row.bucket] = Number(row.sessions);
      }
    });

    const resultData = [];
    let runningTotal = 0;

    for (let i = 100; i >= 0; i--) {
      runningTotal += Number(buckets[i]);
      resultData.push({
        scroll_percentage: i,
        sessions: runningTotal
      });
    }

    resultData.reverse();

    return { totalSessions, scrollData: resultData };
  },
  ['heatmap-scrolls'],
  { revalidate: 60 } // Cache for 60 seconds
);

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
    const startDate = rawStartDate ? new Date(rawStartDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const endDateStr = endDate.toISOString().slice(0, 19).replace('T', ' ');

    console.log('🔍 Heatmap-scrolls API called (with caching)');

    // Use cached query for better performance
    const result = await getCachedScrollData(siteId, pagePath, deviceType, startDateStr, endDateStr);

    // Return encrypted response
    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error fetching scroll heatmap data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Failed to fetch scroll heatmap data', error: errorMessage }, { status: 500 });
  }
}
