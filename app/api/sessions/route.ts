import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Service role key is required for server-side operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Default pagination settings
import { withMonitoring } from "@/lib/api-middleware";

// Default pagination settings
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

async function POST_handler(req: NextRequest) {
  try {
    // Authenticate user first
    const authResult = await authenticateAndAuthorize(req);

    // DEBUG: Log auth failure details
    if (!authResult.isAuthorized) {
      console.log("❌ [API] Sessions Auth Failed:", {
        hasUser: !!authResult.user,
        isAuthorized: authResult.isAuthorized,
        userSitesCount: authResult.userSites.length,
        cookies: req.cookies.getAll().map(c => c.name)
      });
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const { siteId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // Check if user is authorized for this site
    if (!isAuthorizedForSite(authResult.userSites, siteId)) {
      return createUnauthorizedResponse();
    }

    // Validate pagination params
    const validatedPage = Math.max(1, Math.floor(Number(page) || 1));
    const validatedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize) || DEFAULT_PAGE_SIZE)));
    const offset = (validatedPage - 1) * validatedPageSize;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🚀 PERFORMANCE FIX: Query the view directly
    // This supports pagination natively and avoids the 1000-row limit of fetching raw events
    const { data: sessionsData, error: sessionError, count } = await supabase
      .from("sessions_view")
      .select("*", { count: 'exact' })
      .eq("site_id", siteId)
      .order("started_at", { ascending: false })
      .range(offset, offset + validatedPageSize - 1);

    if (sessionError) {
      console.error("Error fetching sessions:", sessionError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Map view data to API response format
    const paginatedSessions = (sessionsData || []).map((session: {
      session_id: string;
      visitor_id: string;
      started_at: string;
      duration: number;
      page_views: number;
      pages: string[];
      country: string;
      ip_address: string;
      device_type: string;
      screen_width: number;
      screen_height: number;
      platform: string;
      user_agent: string;
      signals: Array<{ type: string }>;
    }) => ({
      session_id: session.session_id,
      visitor_id: session.visitor_id,
      timestamp: session.started_at, // Map started_at to timestamp for frontend compatibility
      duration: session.duration,
      page_views: session.page_views,
      pages: session.pages || [],
      country: session.country,
      ip_address: session.ip_address,
      device_type: session.device_type,
      screen_width: session.screen_width,
      screen_height: session.screen_height,
      platform: session.platform,
      user_agent: session.user_agent,
      // Signals are pre-aggregated in the view
      signals: session.signals || [],
      signal_counts: {}, // Calculate if needed or trust pre-calc
      has_rage_clicks: (session.signals || []).some((s) => s.type === 'rage_click'),
      has_dead_clicks: (session.signals || []).some((s) => s.type === 'dead_click'),
      has_u_turns: (session.signals || []).some((s) => s.type === 'u_turn' || s.type === 'quick_exit'),
      has_errors: (session.signals || []).some((s) => ['js_error', 'console_error', 'unhandled_rejection'].includes(s.type)),
    }));

    const totalSessions = count || 0;
    const totalPages = Math.ceil(totalSessions / validatedPageSize);

    return NextResponse.json({
      sessions: paginatedSessions,
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        totalSessions,
        totalPages,
        hasNextPage: validatedPage < totalPages,
        hasPrevPage: validatedPage > 1
      }
    });
  } catch (error: unknown) {
    console.error("Error in sessions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withMonitoring(POST_handler);
