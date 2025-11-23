import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { siteId } = await req.json();

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all rrweb events for the site
    const { data, error } = await supabase
      .from("rrweb_events")
      .select("*")
      .eq("site_id", siteId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    // Group events by session_id
    const sessionMap = new Map<string, any>();

    data.forEach((event) => {
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
          user_agent: event.user_agent || "",
        });
      } else {
        const session = sessionMap.get(sessionId);
        session.pages.add(event.page_path);
        
        // Update first and last timestamps
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
    });

    // Convert to array and calculate durations
    const sessions = Array.from(sessionMap.values()).map((session) => {
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
    sessions.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error in sessions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
