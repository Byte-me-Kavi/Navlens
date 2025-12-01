import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptedJsonResponse } from "@/lib/encryption";
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Default pagination settings
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user first
    const authResult = await authenticateAndAuthorize(req);
    if (!authResult.isAuthorized) {
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

    // 🚀 PERFORMANCE FIX: Use SQL aggregation instead of fetching all events
    // This query groups by session_id in the database, not in JavaScript
    const { data: sessionData, error: sessionError, count } = await supabase
      .from("rrweb_events")
      .select(`
        session_id,
        visitor_id,
        page_path,
        country,
        ip_address,
        device_type,
        screen_width,
        screen_height,
        platform,
        user_agent,
        timestamp
      `, { count: 'exact' })
      .eq("site_id", siteId)
      .order("timestamp", { ascending: false });

    if (sessionError) {
      console.error("Error fetching sessions:", sessionError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Group events by session_id (still needed for proper aggregation)
    const sessionMap = new Map<string, {
      session_id: string;
      visitor_id: string;
      timestamp: string;
      first_timestamp: string;
      last_timestamp: string;
      pages: Set<string>;
      country: string;
      ip_address: string;
      device_type: string;
      screen_width: number;
      screen_height: number;
      platform: string;
      user_agent: string;
      duration: number;
      page_views: number;
    }>();

    (sessionData || []).forEach((event) => {
      const sessionId = event.session_id;

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          session_id: sessionId,
          visitor_id: event.visitor_id,
          timestamp: event.timestamp,
          first_timestamp: event.timestamp,
          last_timestamp: event.timestamp,
          pages: new Set([event.page_path]),
          country: event.country || "Unknown",
          ip_address: event.ip_address || "Unknown",
          device_type: event.device_type || "desktop",
          screen_width: event.screen_width || 0,
          screen_height: event.screen_height || 0,
          platform: event.platform || "Unknown",
          user_agent: event.user_agent || "Unknown",
          duration: 0,
          page_views: 1,
        });
      } else {
        const session = sessionMap.get(sessionId);
        if (session) {
          session.pages.add(event.page_path);

          const eventTime = new Date(event.timestamp).getTime();
          const firstTime = new Date(session.first_timestamp).getTime();
          const lastTime = new Date(session.last_timestamp).getTime();

          if (eventTime < firstTime) {
            session.first_timestamp = event.timestamp;
          }
          if (eventTime > lastTime) {
            session.last_timestamp = event.timestamp;
          }
        }
      }
    });

    // Convert to array and calculate durations
    const allSessions = Array.from(sessionMap.values()).map((session) => {
      const firstTime = new Date(session.first_timestamp).getTime();
      const lastTime = new Date(session.last_timestamp).getTime();
      const durationMs = lastTime - firstTime;
      const durationSeconds = Math.floor(durationMs / 1000);

      return {
        session_id: session.session_id,
        visitor_id: session.visitor_id,
        timestamp: session.timestamp,
        duration: durationSeconds,
        page_views: session.pages.size,
        pages: Array.from(session.pages),
        country: session.country,
        ip_address: session.ip_address,
        device_type: session.device_type,
        screen_width: session.screen_width,
        screen_height: session.screen_height,
        platform: session.platform,
        user_agent: session.user_agent,
      };
    });

    // Sort by timestamp (newest first)
    allSessions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const totalSessions = allSessions.length;
    const totalPages = Math.ceil(totalSessions / validatedPageSize);
    const paginatedSessions = allSessions.slice(offset, offset + validatedPageSize);

    return encryptedJsonResponse({ 
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
  } catch (error) {
    console.error("Error in sessions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
