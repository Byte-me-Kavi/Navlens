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

    // ClickHouse query for aggregated click data by element_selector (not by position)
    const query = `
      SELECT
        element_selector as selector,
        element_tag as tag,
        element_text as text,
        element_id,
        element_classes,
        -- Calculate the centroid of clicks on this element
        round(avg(x), 2) as x,
        round(avg(y), 2) as y,
        -- Include relative coordinates for accurate cross-viewport positioning
        round(avg(x_relative), 4) as x_relative,
        round(avg(y_relative), 4) as y_relative,
        -- Include document dimensions to handle responsive resizing
        round(avg(document_width), 0) as document_width,
        round(avg(document_height), 0) as document_height,
        count(*) as click_count
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        AND event_type = 'click'
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
        AND element_selector != ''
      GROUP BY
        element_selector,
        element_tag,
        element_text,
        element_id,
        element_classes
      ORDER BY click_count DESC
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
      format: 'JSONEachRow', // Request results in JSONEachRow format
    });

    const elementRows = await resultSet.json(); // Get the JSON response as array

    console.log(`[element-clicks] Query executed successfully for pagePath=${pagePath}, deviceType=${deviceType}, returned ${elementRows.length} rows`);

    // Transform to ElementNode format with click data
    interface ElementClickRow {
      selector: string;
      tag: string;
      text: string;
      element_id: string;
      element_classes: string;
      x: string;
      y: string;
      x_relative: string;
      y_relative: string;
      document_width: string;
      document_height: string;
      click_count: string;
    }

    // Calculate total clicks for percentage calculation
    const totalClicks = elementRows.reduce((sum: number, row: any) => sum + parseInt(row.click_count), 0);

    const elementClicks = (elementRows as ElementClickRow[]).map((row) => ({
      selector: row.selector,
      tag: row.tag,
      text: row.text || '',
      x: Math.round(parseFloat(row.x)), // Already rounded in query, ensure integer
      y: Math.round(parseFloat(row.y)), // Already rounded in query, ensure integer
      x_relative: parseFloat(row.x_relative), // Relative coordinates for accurate positioning
      y_relative: parseFloat(row.y_relative), // Relative coordinates for accurate positioning
      document_width: Math.round(parseFloat(row.document_width)),
      document_height: Math.round(parseFloat(row.document_height)),
      width: 0, // Will be calculated from DOM
      height: 0, // Will be calculated from DOM
      href: undefined, // Could be added later if needed
      clickCount: parseInt(row.click_count),
      percentage: totalClicks > 0 ? parseFloat((parseInt(row.click_count) * 100.0 / totalClicks).toFixed(1)) : 0,
      elementId: row.element_id || '',
      elementClasses: row.element_classes || '',
    }));

    return NextResponse.json(elementClicks, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching element click data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch element click data', error: errorMessage },
      { status: 500 }
    );
  }
}