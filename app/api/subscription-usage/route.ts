/**
 * Subscription Usage API
 * Fetches real usage data (sessions, heatmaps) for the current month
 * - Sessions: From Supabase rrweb_events (matching the sessions page)
 * - Heatmaps: From ClickHouse events (unique pages with click data)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, createUnauthenticatedResponse } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized || !authResult.user) {
            return createUnauthenticatedResponse();
        }

        const userSites = authResult.userSites;

        if (!userSites || userSites.length === 0) {
            return NextResponse.json({
                sessions: 0,
                heatmaps: 0,
                month: new Date().toISOString().slice(0, 7),
                sitesCount: 0,
            });
        }

        // Get current month boundaries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startDate = startOfMonth.toISOString();
        const endDate = now.toISOString();

        // ========================================
        // SESSIONS: Query from sessions_view (Bypasses 1000-row limit)
        // (current month only - for billing purposes)
        // ========================================
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Count unique sessions directly from the view
        const { count: totalSessions, error: sessionError } = await supabase
            .from('sessions_view')
            .select('*', { count: 'exact', head: true })
            .in('site_id', userSites)
            .gte('started_at', startDate)
            .lte('started_at', endDate);

        if (sessionError) {
            console.error('[subscription-usage] Supabase error:', sessionError);
        }

        // ========================================
        // HEATMAPS: Query from raw events table directly
        // (Avoiding flawed MV summation of unique counts)
        // ========================================
        const clickhouse = getClickHouseClient();
        const currentMonth = now.toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

        // Use count(distinct) or uniq(page_path) on raw events
        // This is more accurate than summing pre-aggregated uniques which overcounts
        const heatmapsQuery = `
            SELECT 
                uniq(page_path) as total_pages
            FROM events
            WHERE site_id IN ({siteIds:Array(String)})
              AND toStartOfMonth(timestamp) = toDate({currentMonth:String})
              AND page_path != '' 
              AND page_path IS NOT NULL
        `;

        const heatmapsResult = await clickhouse.query({
            query: heatmapsQuery,
            query_params: { siteIds: userSites, currentMonth },
            format: 'JSONEachRow',
        });

        const heatmapsData = await heatmapsResult.json() as Array<{ total_pages: number }>;
        const totalHeatmaps = Number(heatmapsData[0]?.total_pages) || 0;

        return NextResponse.json({
            sessions: totalSessions,
            heatmaps: totalHeatmaps,
            month: now.toISOString().slice(0, 7),
            sitesCount: userSites.length,
        });

    } catch (error: unknown) {
        console.error('[subscription-usage] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }
}
