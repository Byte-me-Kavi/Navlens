import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { authenticateAndAuthorize, createUnauthenticatedResponse } from '@/lib/auth';
import { getUsageStats } from '@/lib/usage-tracker/counter';

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

        const now = new Date();


        // ========================================
        // SESSIONS: Get from Authoritative Counter Table
        // (Ensures dashboard matches limit enforcement)
        // ========================================

        // This helper handles fetching and auto-resetting monthly stats if needed
        const stats = await getUsageStats(authResult.user.id);
        const totalSessions = stats?.sessions_this_month || 0;

        // ========================================
        // HEATMAPS: Count "Created/Saved Snapshots"
        // (Matches the "Heatmap Pages" limit definition)
        // ========================================
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { count: totalHeatmaps, error: heatmapError } = await supabase
            .from('snapshots')
            .select('*', { count: 'exact', head: true })
            .in('site_id', userSites);

        if (heatmapError) {
            console.error('[subscription-usage] Supabase heatmap error:', heatmapError);
        }

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
