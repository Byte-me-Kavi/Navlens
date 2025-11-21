import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
});

interface ElementMetricsRequest {
  siteId: string;
  pagePath: string;
  deviceType: string;
  startDate: string;
  endDate: string;
  elementSelector?: string;
}

interface ClickHouseRow {
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateAndAuthorize(req);
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body: ElementMetricsRequest = await req.json();
    const { siteId, pagePath, deviceType, startDate, endDate, elementSelector } = body;

    // Validate inputs
    if (!siteId || !pagePath || !deviceType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: siteId, pagePath, deviceType, startDate, endDate' },
        { status: 400 }
      );
    }

    // Check if user is authorized for this site
    const authorized = isAuthorizedForSite(authResult.userSites, siteId);
    if (!authorized) {
      return createUnauthorizedResponse();
    }

    // Get element-level metrics
    const elementMetrics = await getElementMetrics(siteId, pagePath, deviceType, startDate, endDate, elementSelector);

    // Get site-wide averages for benchmarking
    const siteAverages = await getSiteAverages(siteId, pagePath, deviceType, startDate, endDate);

    // Get historical trends (current vs previous period)
    const trends = await getHistoricalTrends(siteId, pagePath, deviceType, startDate, endDate);

    return NextResponse.json({
      elementMetrics,
      siteAverages,
      trends,
    });

  } catch (error) {
    console.error('[Elements Metrics API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'Unknown';
    console.error('[Elements Metrics API] Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    return NextResponse.json(
      { error: 'Failed to fetch element metrics data', details: errorMessage },
      { status: 500 }
    );
  }
}

async function getElementMetrics(siteId: string, pagePath: string, deviceType: string, startDate: string, endDate: string, elementSelector?: string) {
  let query = `
    SELECT
      element_selector,
      element_tag,
      element_text,
      element_id,
      element_classes,
      COUNT(*) as total_clicks,
      AVG(scroll_depth) as avg_scroll_depth,
      AVG(x_relative) as avg_x_relative,
      AVG(y_relative) as avg_y_relative,
      MIN(timestamp) as first_click,
      MAX(timestamp) as last_click,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(DISTINCT client_id) as unique_users,
      -- Device breakdown
      COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_clicks,
      COUNT(CASE WHEN device_type = 'tablet' THEN 1 END) as tablet_clicks,
      COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_clicks,
      -- Rage clicks: simplified detection (can be improved later)
      0 as rage_click_sessions,
      -- Dead clicks: clicks on non-interactive elements
      SUM(CASE WHEN element_tag NOT IN ('A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA') THEN 1 ELSE 0 END) as dead_clicks
    FROM events
    WHERE site_id = {siteId:String}
      AND page_path = {pagePath:String}
      AND ({deviceType:String} = 'all' OR device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} != 'all'))
      AND timestamp >= parseDateTimeBestEffort({startDate:String})
      AND timestamp <= parseDateTimeBestEffort({endDate:String})
      AND event_type = 'click'
      ${elementSelector ? 'AND element_selector = {elementSelector:String}' : ''}
    GROUP BY element_selector, element_tag, element_text, element_id, element_classes
    ORDER BY total_clicks DESC
    LIMIT 100
  `;

  const params: any = {
    siteId,
    pagePath,
    deviceType,
    startDate,
    endDate,
  };

  if (elementSelector) {
    params.elementSelector = elementSelector;
  }

  const result = await clickhouse.query({
    query,
    format: 'JSONEachRow',
    query_params: params,
  });

  const rows: ClickHouseRow[] = await result.json();
  return rows;
}

async function getSiteAverages(siteId: string, pagePath: string, deviceType: string, startDate: string, endDate: string) {
  const query = `
    SELECT
      element_tag,
      AVG(total_clicks_per_element) as avg_ctr_by_tag,
      COUNT(*) as element_count
    FROM (
      SELECT
        element_tag,
        COUNT(*) as total_clicks_per_element
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND ({deviceType:String} = 'all' OR device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} != 'all'))
        AND timestamp >= parseDateTimeBestEffort({startDate:String})
        AND timestamp <= parseDateTimeBestEffort({endDate:String})
        AND event_type = 'click'
      GROUP BY element_selector, element_tag
    )
    GROUP BY element_tag
  `;

  const result = await clickhouse.query({
    query,
    format: 'JSONEachRow',
    query_params: {
      siteId,
      pagePath,
      deviceType,
      startDate,
      endDate,
    },
  });

  const rows: ClickHouseRow[] = await result.json();

  // Calculate overall page views for CTR calculation
  const pageViewsQuery = `
    SELECT COUNT(DISTINCT session_id) as total_page_views
    FROM events
    WHERE site_id = {siteId:String}
      AND page_path = {pagePath:String}
      AND ({deviceType:String} = 'all' OR device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} != 'all'))
      AND timestamp >= parseDateTimeBestEffort({startDate:String})
      AND timestamp <= parseDateTimeBestEffort({endDate:String})
      AND event_type = 'pageview'
  `;

  const pageViewsResult = await clickhouse.query({
    query: pageViewsQuery,
    format: 'JSONEachRow',
    query_params: {
      siteId,
      pagePath,
      deviceType,
      startDate,
      endDate,
    },
  });

  const pageViewsData: ClickHouseRow[] = await pageViewsResult.json();
  const totalPageViews = pageViewsData[0]?.total_page_views || 1;

  // Calculate CTR for each element type
  const averages = rows.map((row: ClickHouseRow) => ({
    element_tag: row.element_tag,
    avg_ctr: (row.avg_ctr_by_tag / totalPageViews) * 100,
    element_count: row.element_count,
  }));

  return {
    averages,
    totalPageViews,
  };
}

async function getHistoricalTrends(siteId: string, pagePath: string, deviceType: string, currentStartDate: string, currentEndDate: string) {
  // Calculate previous period (same duration before current period)
  const currentStart = new Date(currentStartDate);
  const currentEnd = new Date(currentEndDate);
  const duration = currentEnd.getTime() - currentStart.getTime();

  const previousEnd = new Date(currentStart.getTime());
  const previousStart = new Date(previousEnd.getTime() - duration);

  const currentPeriodQuery = `
    SELECT
      COUNT(*) as total_clicks,
      AVG(scroll_depth) as avg_scroll_depth,
      COUNT(DISTINCT session_id) as unique_sessions,
      COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_clicks,
      COUNT(CASE WHEN device_type = 'tablet' THEN 1 END) as tablet_clicks,
      COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_clicks
    FROM events
    WHERE site_id = {siteId:String}
      AND page_path = {pagePath:String}
      AND ({deviceType:String} = 'all' OR device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} != 'all'))
      AND timestamp >= parseDateTimeBestEffort({startDate:String})
      AND timestamp <= parseDateTimeBestEffort({endDate:String})
      AND event_type = 'click'
  `;

  const [currentResult, previousResult] = await Promise.all([
    clickhouse.query({
      query: currentPeriodQuery,
      format: 'JSONEachRow',
      query_params: {
        siteId,
        pagePath,
        deviceType,
        startDate: currentStartDate,
        endDate: currentEndDate,
      },
    }),
    clickhouse.query({
      query: currentPeriodQuery,
      format: 'JSONEachRow',
      query_params: {
        siteId,
        pagePath,
        deviceType,
        startDate: previousStart.toISOString(),
        endDate: previousEnd.toISOString(),
      },
    }),
  ]);

  const currentData: ClickHouseRow[] = await currentResult.json();
  const previousData: ClickHouseRow[] = await previousResult.json();

  const current = currentData[0] || { total_clicks: 0, avg_scroll_depth: 0, unique_sessions: 0, desktop_clicks: 0, tablet_clicks: 0, mobile_clicks: 0 };
  const previous = previousData[0] || { total_clicks: 0, avg_scroll_depth: 0, unique_sessions: 0, desktop_clicks: 0, tablet_clicks: 0, mobile_clicks: 0 };

  return {
    current: {
      total_clicks: parseInt(current.total_clicks) || 0,
      avg_scroll_depth: parseFloat(current.avg_scroll_depth) || 0,
      unique_sessions: parseInt(current.unique_sessions) || 0,
      device_breakdown: {
        desktop: parseInt(current.desktop_clicks) || 0,
        tablet: parseInt(current.tablet_clicks) || 0,
        mobile: parseInt(current.mobile_clicks) || 0,
      },
    },
    previous: {
      total_clicks: parseInt(previous.total_clicks) || 0,
      avg_scroll_depth: parseFloat(previous.avg_scroll_depth) || 0,
      unique_sessions: parseInt(previous.unique_sessions) || 0,
      device_breakdown: {
        desktop: parseInt(previous.desktop_clicks) || 0,
        tablet: parseInt(previous.tablet_clicks) || 0,
        mobile: parseInt(previous.mobile_clicks) || 0,
      },
    },
    trends: {
      clicks_change: calculatePercentChange(current.total_clicks, previous.total_clicks),
      scroll_depth_change: calculatePercentChange(current.avg_scroll_depth, previous.avg_scroll_depth),
      sessions_change: calculatePercentChange(current.unique_sessions, previous.unique_sessions),
    },
  };
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}