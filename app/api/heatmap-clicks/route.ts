// app/api/heatmap-clicks/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // 1. Fetch aggregated events from Supabase
    // We look for sessions that match the site, page, and device.
    const { data: rrwebData, error } = await supabase
      .from('rrweb_events')
      .select('events')
      .eq('site_id', siteId)
      .eq('page_path', pagePath)
      .eq('device_type', deviceType)
      .limit(50); // Start with 50 recent sessions for performance

    if (error) throw error;

    // 2. Extract Clicks
    const clickPoints: { x: number, y: number, value: number }[] = [];

    rrwebData?.forEach((row) => {
      // events might be a JSON string or object depending on how it's stored
      const events = typeof row.events === 'string' ? JSON.parse(row.events) : row.events;

      if (Array.isArray(events)) {
          events.forEach((e: any) => {
            // rrweb event type 3 is 'IncrementalSnapshot'
            // data.source 1 is 'MouseInteraction'
            // data.type 2 is 'Click'
            if (e.type === 3 && e.data?.source === 1 && e.data?.type === 2) {
                 clickPoints.push({
                     x: e.data.x,
                     y: e.data.y,
                     value: 1
                 });
            }
          });
      }
    });

    return NextResponse.json({ clicks: clickPoints }, { status: 200 });

  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { message: 'Failed to fetch heatmap data', error: errorMessage },
      { status: 500 }
    );
  }
}