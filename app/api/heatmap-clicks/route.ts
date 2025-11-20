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

    // Query ClickHouse for element-specific click data
    const elementQuery = `
      SELECT
        element_selector as selector,
        element_tag as tag,
        element_text as text,
        element_id as element_id,
        element_classes as element_classes,
        href,
        ROUND(AVG(x), 5) as x,
        ROUND(AVG(y), 5) as y,
        COUNT(*) as click_count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
        AND event_type = 'click'
        AND timestamp >= now() - INTERVAL 30 DAY
        AND element_selector != ''
        AND x > 0
        AND y > 0
      GROUP BY element_selector, element_tag, element_text, element_id, element_classes, href
      HAVING COUNT(*) >= 1
      ORDER BY click_count DESC
      LIMIT 100
    `;

    // Query for all click points (traditional heatmap)
    const allClicksQuery = `
      SELECT
        x,
        y,
        COUNT(*) as value
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND (device_type = {deviceType:String} OR (device_type = '' AND {deviceType:String} = 'desktop'))
        AND event_type = 'click'
        AND timestamp >= now() - INTERVAL 30 DAY
        AND x > 0
        AND y > 0
      GROUP BY x, y
      ORDER BY value DESC
      LIMIT 2000
    `;

    console.log('Executing ClickHouse queries for heatmap clicks');
    console.log('Query params:', { siteId, pagePath, deviceType });

    // Execute element clicks query
    const elementResult = await clickhouse.query({
      query: elementQuery,
      query_params: {
        siteId,
        pagePath,
        deviceType,
      },
      format: 'JSONEachRow',
    });

    // Execute all clicks query
    const allClicksResult = await clickhouse.query({
      query: allClicksQuery,
      query_params: {
        siteId,
        pagePath,
        deviceType,
      },
      format: 'JSONEachRow',
    });

    const elementRows = await elementResult.json();
    const allClicksRows = await allClicksResult.json();

    console.log('ClickHouse returned', elementRows.length, 'element click groups');
    console.log('ClickHouse returned', allClicksRows.length, 'all click points');

    // Transform to ElementNode format with click data
    interface ElementClickRow {
      selector: string;
      tag: string;
      text: string;
      element_id: string;
      element_classes: string;
      href?: string;
      x: string;
      y: string;
      click_count: string;
      percentage: string;
    }

    const elementClicks = (elementRows as ElementClickRow[]).map((row) => ({
      selector: row.selector,
      tag: row.tag,
      text: row.text || '',
      x: parseFloat(row.x), // Keep as float for high precision positioning
      y: parseFloat(row.y), // Keep as float for high precision positioning
      width: 0, // Will be calculated from DOM
      height: 0, // Will be calculated from DOM
      href: row.href || undefined,
      clickCount: parseInt(row.click_count),
      percentage: parseFloat(row.percentage),
      elementId: row.element_id || '',
      elementClasses: row.element_classes || '',
    }));

    // Transform all click points
    interface ClickRow {
      x: string;
      y: string;
      value: string;
    }
    const clickPoints = (allClicksRows as ClickRow[]).map((row) => ({
      x: parseInt(row.x),
      y: parseInt(row.y),
      value: parseInt(row.value),
    }));

    console.log('Returning', elementClicks.length, 'element click data and', clickPoints.length, 'click points to frontend');
    return NextResponse.json({
      elements: elementClicks,
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