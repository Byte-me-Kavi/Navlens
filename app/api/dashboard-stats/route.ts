import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createClickHouseClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

// --- Environment Setup ---

// Lazy initialize Supabase admin client (for Site Count and Heatmap Count)
let supabaseAdmin: ReturnType<typeof createSupabaseClient> | null = null;
function getSupabaseAdminClient() {
    if (!supabaseAdmin) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !key) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseAdmin = createSupabaseClient(supabaseUrl, key);
    }
    return supabaseAdmin;
}

// Initialize ClickHouse client (for Total Clicks)
const clickHouseClient = createClickHouseClient({
    host: process.env.CLICKHOUSE_HOST,
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE,
});

export async function GET(req: NextRequest) {
    try {
        const supabase = getSupabaseAdminClient();
        
        // --- 1. Get Total Sites (from Supabase/PostgreSQL) ---
        // Note: Using `count()` requires RLS to be configured for the admin role, 
        // or we use the service role key which bypasses RLS for this aggregated count.
        const { count: totalSites, error: siteError } = await supabase
            .from('sites')
            .select('*', { count: 'exact', head: true });
        
        if (siteError) {
            console.error('Supabase Site Count Error:', siteError);
            throw new Error('Failed to fetch site count.');
        }

        // --- 2. Get Total Clicks (from ClickHouse) ---
        const totalClicksQuery = `SELECT count() AS total_clicks FROM events WHERE event_type = 'click'`;
        
        const clickResult = await clickHouseClient.query({ query: totalClicksQuery, format: 'JSON' });
        const clickData = await clickResult.json();
        const totalClicks = (clickData.data[0] as any)?.total_clicks || 0;


        // --- 3. Get Total Heatmaps Generated (from Supabase Storage) ---
        // This counts the number of files in the "screenshots" bucket
        const { data: fileList, error: storageError } = await supabase.storage
            .from('screenshots')
            .list('', { limit: 10000 }); // List up to 10k files

        if (storageError) {
            console.error('Supabase Storage Error:', storageError);
            throw new Error('Failed to fetch screenshot count.');
        }
        
        const totalHeatmaps = fileList.length;


        // --- 4. Return Aggregated Stats ---
        return NextResponse.json({
            totalSites: totalSites || 0,
            totalClicks: totalClicks,
            totalHeatmaps: totalHeatmaps,
            activeSessions: 'N/A' // Requires more complex real-time aggregation which we skip for MVP
        }, { status: 200 });

    } catch (error: any) {
        console.error('Dashboard Stats Error:', error.message);
        return NextResponse.json(
            { message: 'Failed to retrieve dashboard stats.', error: error.message },
            { status: 500 }
        );
    }
}