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
  if (!isAuthorizedForSite(authResult.userSites, siteId) || !authResult.user) {
    return createUnauthorizedResponse();
  }

  // --- LIMIT ENFORCEMENT START (Heatmap Pages) ---
  const { data: profile } = await (await import('@/lib/supabase/server-admin')).createClient() // Use dynamic import to avoid circular dep if needed, or better, reuse auth user context if it had sub info.
    // Actually, authenticationAndAuthorize returns 'user' but not full profile with sub. 
    // We need to fetch it.
    .from('profiles')
    .select(`
          subscriptions (
              status,
              subscription_plans (
                  name,
                  limits
              )
          )
      `)
    .eq('user_id', authResult.user.id)
    .single();

  let maxPages = 3; // Default Free
  if (profile?.subscriptions) {
    const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
    if (sub?.status === 'active' && sub?.subscription_plans) {
      const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
      const limits = plan.limits as any;
      if (limits?.heatmap_pages !== undefined) {
        maxPages = limits.heatmap_pages;
      } else {
        // Fallback
        const planName = plan.name?.toLowerCase() || '';
        if (planName.includes('starter')) maxPages = 8;
        else if (planName.includes('pro')) maxPages = 15;
        else if (planName.includes('enterprise')) maxPages = -1;
      }
    }
  }

  if (maxPages !== -1) {
    // Check if this page is in the Top N allowed pages
    // Query ClickHouse for Top N pages by event count
    const topPagesQuery = `
        SELECT page_path 
        FROM events 
        WHERE site_id = {siteId:String} 
        GROUP BY page_path 
        ORDER BY count(*) DESC 
        LIMIT {limit:UInt32}
      `;

    const topPagesResult = await clickhouse.query({
      query: topPagesQuery,
      query_params: { siteId, limit: maxPages },
      format: 'JSONEachRow'
    });

    const topPages = await topPagesResult.json<{ page_path: string }>();
    const allowedPaths = topPages.map(p => p.page_path);

    // Normalize paths (handle trailing slashes just in case, though usually exact match in CH)
    const isAllowed = allowedPaths.includes(pagePath);

    if (!isAllowed && allowedPaths.length >= maxPages) {
      // It's blocked ONLY if we already hit the limit AND this page isn't in it.
      // If we haven't hit limit (e.g. allowed 3, only have 2), then any new page is "allowed" (it becomes #3).
      // The query `LIMIT maxPages` returns at most maxPages. 
      // If `allowedPaths.length < maxPages`, then we haven't filled the quota, so implicitly this new page "could" be one of them.
      // But wait, if it's not in the result, it means it has 0 events OR it has fewer events than the top N.
      // If `topPages` has `maxPages` items, and `pagePath` is not in it, then it's outside the quota.
      // If `topPages` has `< maxPages` items, then `pagePath` MIGHT be one of them (if it was included) or it's a new page that WILL be included.

      // Correct Logic:
      // If `topPages.length` equals `maxPages` AND `!topPages.includes(pagePath)`, then REJECT.
      // Else, ALLOW.

      return NextResponse.json(
        { message: `Plan limit reached. You can only view heatmaps for your top ${maxPages} pages. Upgrade to view more.` },
        { status: 403 }
      );
    }
  }
  // --- LIMIT ENFORCEMENT END ---

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

  } catch (error: unknown) {
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
