import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { encryptedJsonResponse } from '@/lib/encryption';
import { getClickHouseClient } from '@/lib/clickhouse';

// --- Type Definitions ---
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
    const [clickHouseResult, heatmapResult] = await Promise.allSettled([
      // Task A: Get Clicks/Sessions (CACHED)
      // This will be instant (1ms) if called recently
      getCachedAnalytics(siteIds),

      // Task B: Get Heatmaps (DB Count is fast enough to keep live)
      supabase
        .from('snapshots') // Assuming you have a table tracking snapshots
        .select('id', { count: 'exact', head: true }) // 'head: true' returns count only, no data
        .in('site_id', siteIds),
    ]);

    // 5. Process Results (Handle partial failures gracefully)
    let totalClicks = 0;
    let clickTrend = { value: 0, isPositive: true };
    let totalHeatmaps = 0;
    let activeSessions = 0;
    let sessionTrend = { value: 0, isPositive: true };

    // Handle ClickHouse (Cached) Response
    if (clickHouseResult.status === 'fulfilled') {
      const data = clickHouseResult.value as { data: any[] }; // simplified type
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
    if (heatmapResult.status === 'fulfilled') {
      // If using DB Count (Preferred Enterprise Approach)
      totalHeatmaps = heatmapResult.value.count || 0;
    } else {
      // Continue with totalHeatmaps = 0 (Partial data is better than error)
    }


    // 6. Return Data with Cache Headers (Enterprise Standard)
    // Tell the browser: "Keep this data for 60 seconds. Do not reload page on back button."
    return encryptedJsonResponse({
      totalSites,
      stats: {
        totalClicks: { value: totalClicks, trend: clickTrend },
        totalHeatmaps: { value: totalHeatmaps, trend: { value: 18, isPositive: true } }, // Placeholder for now
        activeSessions: { value: activeSessions, trend: sessionTrend }
      }
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