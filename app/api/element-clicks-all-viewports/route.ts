// app/api/element-clicks-all-viewports/route.ts

import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';

// Initialize ClickHouse client
const client = (() => {
  const url = process.env.CLICKHOUSE_URL;

  if (url) {
    console.log('[element-clicks-all-viewports] Initializing ClickHouse Cloud client');
    return createClient({ url });
  } else {
    console.log('[element-clicks-all-viewports] Initializing local ClickHouse client');
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

    if (!validators.isValidUUID(siteId)) {
      return NextResponse.json(
        { message: 'Invalid siteId format' },
        { status: 400 }
      );
    }

    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    const endDate = rawEndDate ? new Date(rawEndDate) : new Date();
    const startDate = rawStartDate ? new Date(rawStartDate) : new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    console.log('[ELEMENT-CLICKS-ALL-VIEWPORTS] Fetching clicks for all viewport sizes');
    console.log('- siteId:', siteId);
    console.log('- pagePath:', pagePath);
    console.log('- deviceType:', deviceType);

    // Query for element clicks across ALL viewport sizes
    const query = `
      SELECT
        element_selector as selector,
        element_tag as tag,
        any(element_text) as text,
        any(element_id) as element_id,
        any(element_classes) as element_classes,
        round(avg(x), 2) as x,
        round(avg(y), 2) as y,
        round(avg(x_relative), 4) as x_relative,
        round(avg(y_relative), 4) as y_relative,
        -- Use normalized viewport dimensions
        1920 as document_width,
        1080 as document_height,
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
        element_tag
      ORDER BY click_count DESC
    `;

    const resultSet = await client.query({
      query: query,
      query_params: {
        siteId: siteId,
        pagePath: pagePath,
        deviceType: deviceType,
        startDate: startDate.toISOString().slice(0, 19).replace('T', ' '),
        endDate: endDate.toISOString().slice(0, 19).replace('T', ' '),
      },
      format: 'JSONEachRow',
    });

    const elementRows = await resultSet.json();

    console.log(`[element-clicks-all-viewports] Returned ${elementRows.length} aggregated elements`);

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

    const transformedData = (elementRows as ElementClickRow[]).map((row) => ({
      selector: row.selector,
      tag: row.tag,
      text: row.text,
      elementId: row.element_id,
      elementClasses: row.element_classes,
      x: parseFloat(row.x),
      y: parseFloat(row.y),
      x_relative: parseFloat(row.x_relative),
      y_relative: parseFloat(row.y_relative),
      documentWidth: parseInt(row.document_width),
      documentHeight: parseInt(row.document_height),
      clickCount: parseInt(row.click_count),
    }));

    return encryptedJsonResponse(transformedData, { status: 200 });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[element-clicks-all-viewports] Error:', err);
    return NextResponse.json({
      error: 'Internal server error',
      details: err.message
    }, { status: 500 });
  }
}
