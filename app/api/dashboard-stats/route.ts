import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

import { getClickHouseClient } from '@/lib/clickhouse';

// --- Type Definitions ---
// Helper for safe result handling
const handleResult = (result: PromiseSettledResult<any>, transform: (data: any) => any, fallback: any = undefined) => {
  if (result.status === 'fulfilled') {
    try {
      return transform(result.value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

interface ClickData {
  total_clicks: number;
}

interface TrendData {
  current_clicks: number;
  prev_clicks: number;
}

interface SessionData {
  current_active: number;
  prev_active: number;
}

// --- Helper Function ---
function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    // If we have 0 previous data, but we have data now, it's technically 100% increase (or infinite)
    // We cap it at 100% to look clean.
    return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  }

  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.round(Math.abs(change)), // Remove decimals
    isPositive: change >= 0
  };
}

// --- Use Singleton ClickHouse Client ---
const clickHouseClient = getClickHouseClient();

// --- 1. THE CACHED DATA FETCHER ---
// This function will execute ONCE every 60 seconds per user. 
// Everyone else gets the saved result instantly.
const getCachedAnalytics = unstable_cache(
  async (siteIds: string[]) => {
    const start = performance.now();

    // Optimized Query using precalculated dashboard_stats_hourly table
    const queryPromise = clickHouseClient.query({
      query: `
        SELECT 
          sum(if(hour >= now() - INTERVAL 7 DAY, total_clicks, 0)) as current_clicks,
          sum(if(hour >= now() - INTERVAL 14 DAY AND hour < now() - INTERVAL 7 DAY, total_clicks, 0)) as prev_clicks,
          sum(if(hour >= now() - INTERVAL 24 HOUR, unique_sessions, 0)) as current_active,
          sum(if(hour >= now() - INTERVAL 48 HOUR AND hour < now() - INTERVAL 24 HOUR, unique_sessions, 0)) as prev_active
        FROM dashboard_stats_hourly
        WHERE site_id IN ({siteIds:Array(String)})
          AND hour >= now() - INTERVAL 14 DAY
      `,
      query_params: { siteIds: siteIds },
      format: 'JSON'
    }).then(res => res.json());

    const result = await queryPromise;
    return result;
  },
  ['dashboard-analytics'], // Cache Key Tag
  { revalidate: 60 } // Update data at most once every 60 seconds
);

export async function GET() {
  const start = performance.now(); // Metric for logging

  try {
    // 1. Await cookies (Required for Next.js 15+)
    const cookieStore = await cookies();

    // 2. Initialize Supabase Client
    // We use createServerClient to properly read the user's session from cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Optional: This is a GET route (read-only), so we don't strictly need to set cookies,
            // but this handles session refreshing if Supabase attempts it.
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in Server Components/GET routes
            }
          },
        },
      }
    );

    // 3. Get authenticated user first to distinguish between auth failure and no sites
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[dashboard-stats] Auth failed:', authError?.message || 'No user session');
      return NextResponse.json({
        message: 'Authentication required',
        error: 'Please log in to access dashboard stats'
      }, { status: 401 });
    }

    // 4. Query sites with explicit user filter (RLS backup)
    const { data: userSites, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id);

    // If RLS fails or query error
    if (siteError) {
      console.log('[dashboard-stats] Site query error:', siteError.message);
      return NextResponse.json({
        message: 'Failed to fetch sites',
        error: siteError.message
      }, { status: 500 });
    }

    // Handle case where user has no sites yet (Early exit saves resources)
    if (!userSites || userSites.length === 0) {
      return NextResponse.json({
        totalSites: 0,
        stats: {
          totalClicks: { value: 0, trend: { value: 0, isPositive: true } },
          totalHeatmaps: { value: 0, trend: { value: 0, isPositive: true } },
          activeSessions: { value: 0, trend: { value: 0, isPositive: true } }
        }
      }, { status: 200 });
    }

    const siteIds = userSites.map(s => s.id);
    const totalSites = siteIds.length;

    // 4. PARALLEL EXECUTION (Now with Caching!)
    const clickHouseResult = await Promise.allSettled([
      // Task A: Get Clicks/Sessions (CACHED)
      // This will be instant (1ms) if called recently
      getCachedAnalytics(siteIds),

      // Task B: Get Heatmaps (DB Count is fast enough to keep live)
      supabase
        .from('snapshots') // Assuming you have a table tracking snapshots
        .select('id', { count: 'exact', head: true }) // 'head: true' returns count only, no data
        .in('site_id', siteIds),

      // Task C: Get Top Pages (Optimized MV Query)
      clickHouseClient.query({
        query: `
          SELECT
            page_path,
            sum(visits) as count
          FROM top_pages_hourly
          WHERE site_id IN ({siteIds:Array(String)})
            AND hour >= now() - INTERVAL 7 DAY
          GROUP BY page_path
          ORDER BY count DESC
          LIMIT 5
        `,
        query_params: { siteIds: siteIds },
        format: 'JSON'
      }).then(res => res.json()),

      // Task D: Get Weekly Activity (Daily Clicks)
      clickHouseClient.query({
        query: `
          SELECT
            toStartOfDay(hour) as day,
            sum(total_clicks) as clicks
          FROM dashboard_stats_hourly
          WHERE site_id IN ({siteIds:Array(String)})
            AND hour >= now() - INTERVAL 7 DAY
          GROUP BY day
          ORDER BY day ASC
        `,
        query_params: { siteIds: siteIds },
        format: 'JSON'
      }).then(res => res.json()),

      // Task E: Live Users (5 min)
      clickHouseClient.query({
        query: `
          SELECT uniq(session_id) as count
          FROM events
          WHERE site_id IN ({siteIds:Array(String)})
            AND timestamp >= now() - INTERVAL 5 MINUTE
        `,
        query_params: { siteIds: siteIds },
        format: 'JSON'
      }).then(res => res.json()),

      // Task F: Frustration Signals (Today) - Uses frustration_stats_hourly MV + debug_events for errors
      Promise.all([
        // Rage clicks and dead clicks from MV
        clickHouseClient.query({
          query: `
            SELECT 
              sum(rage_clicks) as rage_clicks,
              sum(dead_clicks) as dead_clicks
            FROM frustration_stats_hourly
            WHERE site_id IN ({siteIds:Array(String)})
              AND hour >= toStartOfDay(now())
          `,
          query_params: { siteIds: siteIds },
          format: 'JSON'
        }).then(res => res.json()),
        // Console errors from debug_events
        clickHouseClient.query({
          query: `
            SELECT count() as errors
            FROM debug_events
            WHERE site_id IN ({siteIds:Array(String)})
              AND timestamp >= toStartOfDay(now())
              AND console_level = 'error'
          `,
          query_params: { siteIds: siteIds },
          format: 'JSON'
        }).then(res => res.json())
      ]).then(([frustration, errors]) => ({
        ...frustration,
        errors: errors
      })),

      // Task G: Recent Sessions (Feed) - Uses session_analytics MV
      clickHouseClient.query({
        query: `
          SELECT 
            session_id,
            device_type as device,
            start_time,
            end_time,
            rage_clicks as rage_count,
            event_count
          FROM session_analytics
          WHERE site_id IN ({siteIds:Array(String)})
            AND end_time >= now() - INTERVAL 24 HOUR
          ORDER BY end_time DESC
          LIMIT 3
        `,
        query_params: { siteIds: siteIds },
        format: 'JSON'
      }).then(res => res.json()),

      // Task H: Device Breakdown (7 Days) - Uses device_stats_daily MV
      clickHouseClient.query({
        query: `
          SELECT 
            device_type,
            uniqMerge(unique_sessions) as count
          FROM device_stats_daily
          WHERE site_id IN ({siteIds:Array(String)})
            AND day >= toStartOfDay(now() - INTERVAL 7 DAY)
          GROUP BY device_type
          ORDER BY count DESC
        `,
        query_params: { siteIds: siteIds },
        format: 'JSON'
      }).then(res => res.json()),

      // Task I: Core Web Vitals (7 Days)
      clickHouseClient.query({
        query: `
          SELECT 
            avgIf(load_time, event_type = 'LCP' AND load_time > 0) as lcp
            -- Add CLS if available, otherwise just LCP
          FROM events
          WHERE site_id IN ({siteIds:Array(String)})
            AND timestamp >= now() - INTERVAL 7 DAY
        `,
        query_params: { siteIds: siteIds },
        format: 'JSON'
      }).then(res => res.json())
    ]);

    // 5. Process Results (Handle partial failures gracefully)
    let totalClicks = 0;
    let clickTrend = { value: 0, isPositive: true };
    let totalHeatmaps = 0;
    let activeSessions = 0;
    let sessionTrend = { value: 0, isPositive: true };
    let topPages: { path: string; visits: number }[] = [];
    let weeklyActivity: { date: string; clicks: number }[] = [];

    // Handle ClickHouse (Cached) Response
    if (clickHouseResult[0].status === 'fulfilled') {
      const data = clickHouseResult[0].value as { data: any[] }; // simplified type
      const megaData = data.data[0];
      const currentClicks = megaData?.current_clicks || 0;
      const prevClicks = megaData?.prev_clicks || 0;
      totalClicks = currentClicks;
      clickTrend = calculateTrend(currentClicks, prevClicks);

      const currentActive = megaData?.current_active || 0;
      const prevActive = megaData?.prev_active || 0;
      activeSessions = currentActive;
      sessionTrend = calculateTrend(currentActive, prevActive);

    } else {
      // Continue with zeros (Partial data is better than error)
    }

    // Handle Heatmap Response
    if (clickHouseResult[1].status === 'fulfilled') {
      // If using DB Count (Preferred Enterprise Approach)
      totalHeatmaps = clickHouseResult[1].value.count || 0;
    } else {
      // Continue with totalHeatmaps = 0 (Partial data is better than error)
    }

    // Handle Top Pages Response
    if (clickHouseResult[2].status === 'fulfilled') {
      const data = clickHouseResult[2].value as { data: any[] };
      topPages = data.data.map((row: any) => ({
        path: row.page_path,
        visits: +row.count
      }));
    }

    // Handle Weekly Activity Response
    if (clickHouseResult[3].status === 'fulfilled') {
      const data = clickHouseResult[3].value as { data: any[] };
      // Create a map of existing data
      const dataMap = new Map(data.data.map((row: any) => [row.day.split(' ')[0], +row.clicks]));

      // Fill in last 7 days including today
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const clicks = dataMap.get(dateStr) || 0;
        weeklyActivity.push({ date: dateStr, clicks });
      }
    }

    // Process New Metrics (Live, Frustration, Sessions, Devices, Vitals)
    const liveUsers = handleResult(clickHouseResult[4], (d: any) => +d.data[0]?.count || 0);
    const frustration = handleResult(clickHouseResult[5], (d: any) => {
      // d contains: { data: [...], errors: { data: [...] } }
      const frustData = d.data?.[0] || {};
      const errorData = d.errors?.data?.[0] || {};
      return {
        rageClicks: +frustData.rage_clicks || 0,
        deadClicks: +frustData.dead_clicks || 0,
        errors: +errorData.errors || 0
      };
    }, { rageClicks: 0, deadClicks: 0, errors: 0 });

    const recentSessions = handleResult(clickHouseResult[6], (d: any) => {
      return d.data.map((row: any) => {
        const durationMs = new Date(row.end_time).getTime() - new Date(row.start_time).getTime();
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        const durationStr = `${minutes}m ${seconds}s`;

        // Determine status
        let status: 'smooth' | 'frustrated' | 'bounced' = 'smooth';
        if (row.rage_count > 0) status = 'frustrated';
        else if (row.event_count < 3 && durationMs < 5000) status = 'bounced';

        return {
          id: row.session_id,
          country: 'Unknown', // row.country if available
          duration: durationStr,
          device: row.device || 'Desktop',
          status
        };
      });
    }, []);

    const deviceStats = handleResult(clickHouseResult[7], (d: any) => {
      return d.data.map((row: any) => ({
        device: row.device_type || 'Desktop',
        count: +row.count
      }));
    }, []);

    const webVitals = handleResult(clickHouseResult[8], (d: any) => ({
      lcp: +(d.data[0]?.lcp || 0).toFixed(2),
      cls: 0 // Placeholder
    }), { lcp: 0, cls: 0 });

    // 6. Return Data with Cache Headers (Enterprise Standard)
    // Tell the browser: "Keep this data for 60 seconds. Do not reload page on back button."
    return NextResponse.json({
      totalSites,
      stats: {
        totalClicks: { value: totalClicks, trend: clickTrend },
        totalHeatmaps: { value: totalHeatmaps, trend: { value: 18, isPositive: true } }, // Placeholder for now
        activeSessions: { value: activeSessions, trend: sessionTrend }
      },
      topPages,
      weeklyActivity,
      liveUsers,
      frustration,
      recentSessions,
      deviceStats,
      webVitals
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}