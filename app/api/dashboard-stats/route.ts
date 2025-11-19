import { createClient } from '@clickhouse/client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// --- Type Definitions ---
interface ClickData {
  total_clicks: number;
}

// --- ClickHouse Client Setup ---
const clickHouseClient = (() => {
    const url = process.env.CLICKHOUSE_URL;
    
    if (url) {
        // Production: Use full URL for ClickHouse Cloud (https://user:pass@host:8443/database)
        return createClient({ url });
    } else {
        // Development: Use host-based configuration for local ClickHouse
        return createClient({
            url: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
            username: process.env.CLICKHOUSE_USER,
            password: process.env.CLICKHOUSE_PASSWORD,
            database: process.env.CLICKHOUSE_DATABASE,
        });
    }
})();

export async function GET() {
  try {
    // 1. Await cookies (Required for Next.js 15+)
    const cookieStore = await cookies();
    console.log('[Dashboard Stats] Cookies available:', cookieStore.getAll().map(c => c.name).join(', '));

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

    // 3. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[Dashboard Stats] Auth Check - Error:', authError, 'User:', user?.id || 'none');

    if (authError || !user) {
      console.error('[Dashboard Stats] Authentication failed:', authError?.message || 'No user');
      return NextResponse.json({ message: 'Unauthorized', error: authError?.message }, { status: 401 });
    }

    console.log('[Dashboard Stats] User authenticated:', user.id);

    // 4. Get Sites Owned by User
    // We fetch ONLY the site IDs this user owns to filter the data securely
    const { data: userSites, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('user_id', user.id);

    if (siteError) throw new Error(siteError.message);

    console.log('[Dashboard Stats] User sites:', userSites?.length || 0);

    // Handle case where user has no sites yet
    if (!userSites || userSites.length === 0) {
      console.log('[Dashboard Stats] No sites found, returning zero stats');
      return NextResponse.json({
        totalSites: 0,
        totalClicks: 0,
        totalHeatmaps: 0,
        activeSessions: 0
      }, { status: 200 });
    }

    const siteIds = userSites.map(s => s.id);
    const totalSites = siteIds.length;

    console.log('[Dashboard Stats] Fetching click data for sites');

    // 5. Get Total Clicks from ClickHouse (Filtered by Site IDs)
    const totalClicksQuery = `
      SELECT count() AS total_clicks 
      FROM events 
      WHERE event_type = 'click' 
      AND site_id IN ({siteIds:Array(String)})
    `;

    let totalClicks = 0;
    try {
      const clickResult = await clickHouseClient.query({ 
        query: totalClicksQuery, 
        query_params: { siteIds: siteIds },
        format: 'JSON' 
      });
      
      const clickData = await clickResult.json() as { data: ClickData[] };
      totalClicks = clickData.data[0]?.total_clicks || 0;
      console.log('[Dashboard Stats] Total clicks retrieved:', totalClicks);
    } catch (chError) {
      console.error('[Dashboard Stats] ClickHouse Error:', chError);
      console.log('[Dashboard Stats] Continuing with totalClicks = 0');
    }

    // 6. Get Total Heatmaps from Storage (Filtered by Site IDs)
    // We list the root of the bucket. 
    // Note: This assumes your folders are named after site_ids.
    let totalHeatmaps = 0;
    try {
      // Ensure buckets exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const screenshotsBucket = buckets?.find(b => b.name === 'screenshots');
      const snapshotsBucket = buckets?.find(b => b.name === 'snapshots');

      if (!screenshotsBucket) {
        console.log('[Dashboard Stats] Creating screenshots bucket...');
        const { error: createError } = await supabase.storage.createBucket('screenshots', {
          public: false, // Private bucket
          allowedMimeTypes: ['application/json', 'image/png'],
          fileSizeLimit: 10485760 // 10MB
        });
        if (createError) {
          console.error('[Dashboard Stats] Failed to create screenshots bucket:', createError);
          // Continue with totalHeatmaps = 0
        }
      }

      if (!snapshotsBucket) {
        console.log('[Dashboard Stats] Creating snapshots bucket...');
        const { error: createError } = await supabase.storage.createBucket('snapshots', {
          public: false, // Private bucket
          allowedMimeTypes: ['application/json'],
          fileSizeLimit: 10485760 // 10MB
        });
        if (createError) {
          console.error('[Dashboard Stats] Failed to create snapshots bucket:', createError);
          // Continue
        }
      }

      const { data: fileList, error: storageError } = await supabase.storage
        .from('screenshots')
        .list();

      if (!storageError && fileList) {
        // Count only folders that match our user's site IDs
        totalHeatmaps = fileList.filter(file => siteIds.includes(file.name)).length;
        console.log('[Dashboard Stats] Total heatmaps retrieved:', totalHeatmaps);
      } else {
        console.error('[Dashboard Stats] Storage Error:', storageError?.message);
      }
    } catch (storageErr) {
      console.error('[Dashboard Stats] Storage Exception:', storageErr);
    }

    // 7. Return Data
    console.log('[Dashboard Stats] Returning stats - Sites:', totalSites, 'Clicks:', totalClicks, 'Heatmaps:', totalHeatmaps);
    return NextResponse.json({
      totalSites,
      totalClicks,
      totalHeatmaps,
      activeSessions: 0 // Placeholder
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dashboard Stats] Critical Error:', errorMessage);
    return NextResponse.json(
      { message: 'Failed to retrieve dashboard stats.', error: errorMessage },
      { status: 500 }
    );
  }
}