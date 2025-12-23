// app/api/heatmap-clicks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

import { getClickHouseClient } from '@/lib/clickhouse';

// Get the singleton ClickHouse client
const clickhouse = getClickHouseClient();

// Cached query executor - caches results for 60 seconds
// Cached query executor - caches results for 60 seconds
const getCachedHeatmapClicks = unstable_cache(
  async (siteId: string, pagePath: string, deviceType: string, documentWidth: number, documentHeight: number, dateRangeDays: number) => {

    // Construct dynamic condition based on provided dimensions
    // If dimensions are 0 (not provided), we fetch ALL clicks for the page/device (aggregated)
    const hasDimensions = documentWidth > 0 && documentHeight > 0;

    // Optimized query using precalculated heatmap_clicks_daily table
    const allClicksQuery = `
      SELECT
        x_relative,
        y_relative,
        ${hasDimensions ? '{documentWidth:UInt32}' : '0'} as document_width,
        ${hasDimensions ? '{documentHeight:UInt32}' : '0'} as document_height,
        sum(click_count) as value
      FROM heatmap_clicks_daily
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        ${hasDimensions ? 'AND document_width = {documentWidth:UInt32}' : ''}
        ${hasDimensions ? 'AND document_height = {documentHeight:UInt32}' : ''}
        AND day >= today() - {dateRangeDays:UInt32}
      GROUP BY x_relative, y_relative
      ORDER BY value DESC
      LIMIT 5000
    `;

    const allClicksResult = await clickhouse.query({
      query: allClicksQuery,
      query_params: { siteId, pagePath, deviceType, documentWidth, documentHeight, dateRangeDays },
      format: 'JSONEachRow',
    });

    const allClicksRows = await allClicksResult.json();

    interface ClickRow {
      x_relative: string;
      y_relative: string;
      document_width: string;
      document_height: string;
      value: string;
    }

    return (allClicksRows as ClickRow[]).map((row) => ({
      x_relative: parseFloat(row.x_relative),
      y_relative: parseFloat(row.y_relative),
      document_width: parseInt(row.document_width),
      document_height: parseInt(row.document_height),
      value: parseInt(row.value),
    }));
  },
  ['heatmap-clicks'],
  { revalidate: 60 } // Cache for 60 seconds
);

// Shared logic for processing heatmap clicks
async function processHeatmapClicks(
  siteId: string,
  pagePath: string,
  deviceType: string,
  documentWidth: number,
  documentHeight: number,
  dateRangeDays: number,
  authResult: Awaited<ReturnType<typeof authenticateAndAuthorize>>
) {
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

  console.log('Query parameters:');
  console.log('- siteId:', siteId);
  console.log('- pagePath:', pagePath);
  console.log('- deviceType:', deviceType);
  console.log('- dims:', documentWidth, 'x', documentHeight || '(aggregating)');

  // Use cached query for better performance
  console.log('🚀 Fetching heatmap clicks (with caching), dateRange:', dateRangeDays, 'days');

  // Ensure we pass 0 if undefined/null to match cache key signature safely
  const safeWidth = documentWidth || 0;
  const safeHeight = documentHeight || 0;

  const clickPoints = await getCachedHeatmapClicks(siteId, pagePath, deviceType, safeWidth, safeHeight, dateRangeDays);

  console.log('🔍 [HEATMAP-CLICKS] Returning', clickPoints.length, 'heatmap points');

  // Return encrypted response
  return NextResponse.json({
    clicks: clickPoints
  });
}

import { withMonitoring } from "@/lib/api-middleware";

/**
 * POST handler - Preferred method for security (data in body, not URL)
 */
async function POST_handler(req: NextRequest) {
  try {
    // Authenticate user and get their authorized sites
    const authResult = await authenticateAndAuthorize(req);

    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const siteId = body.siteId;
    const pagePath = body.pagePath;
    const deviceType = body.deviceType || 'desktop';
    // Allow optional dimensions (default to 0 to signal aggregation)
    const documentWidth = body.documentWidth || 0;
    const documentHeight = body.documentHeight || 0;
    const dateRangeDays = body.dateRangeDays || 30; // Default to 30 days

    return await processHeatmapClicks(siteId, pagePath, deviceType, documentWidth, documentHeight, dateRangeDays, authResult);

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Network') || errorMessage.includes('ECONNREFUSED') ? 503 : 500;
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status }
    );
  }
}

export const POST = withMonitoring(POST_handler);

/**
 * GET handler - Deprecated, use POST for security
 * Kept for backward compatibility
 */
export async function GET(req: NextRequest) {
  console.warn('⚠️ GET request to /api/heatmap-clicks is deprecated. Use POST for security.');

  try {
    // Authenticate user and get their authorized sites
    const authResult = await authenticateAndAuthorize(req);

    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId') || '';
    const pagePath = searchParams.get('pagePath') || '';
    const deviceType = searchParams.get('deviceType') || 'desktop';
    const documentWidth = parseInt(searchParams.get('documentWidth') || '0');
    const documentHeight = parseInt(searchParams.get('documentHeight') || '0');
    const dateRangeDays = parseInt(searchParams.get('dateRangeDays') || '30');

    return await processHeatmapClicks(siteId, pagePath, deviceType, documentWidth, documentHeight, dateRangeDays, authResult);

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Heatmap clicks error (GET):', err);
    return NextResponse.json({
      error: 'Internal server error',
      details: err.message
    }, { status: 500 });
  }
}
