import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { authenticateAndAuthorize, createUnauthenticatedResponse } from '@/lib/auth';
import { getUserPlanLimits } from '@/lib/usage-tracker/counter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Service role key is required for server-side operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized || !authResult.user) {
            return createUnauthenticatedResponse();
        }

        const userSites = authResult.userSites;

        // Get user's plan limits first
        const limits = await getUserPlanLimits(authResult.user.id);

        if (!userSites || userSites.length === 0) {
            return NextResponse.json({
                sessions: 0,
                heatmaps: 0,
                month: new Date().toISOString().slice(0, 7),
                sitesCount: 0,
                limits: {
                    sessions: limits.sessions,
                    heatmaps: limits.heatmap_pages,
                    max_sites: limits.max_sites,
                },
            });
        }

        const now = new Date();
        const supabase = createClient(supabaseUrl, supabaseKey);

        // ========================================
        // SESSIONS: Count from rrweb_events (matches admin dashboard)
        // Each distinct session_id in current month = 1 session
        // ========================================
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        let totalSessions = 0;

        // Count unique sessions across all user's sites for current month
        for (const siteId of userSites) {
            // Try RPC first (if exists), fallback to manual count
            const { data: rpcCount, error: rpcError } = await supabase
                .rpc('get_site_recordings_count', { p_site_id: siteId });

            if (!rpcError && rpcCount !== null) {
                totalSessions += rpcCount;
            } else {
                // Fallback: count distinct sessions from rrweb_events
                const { data: sessions } = await supabase
                    .from('rrweb_events')
                    .select('session_id')
                    .eq('site_id', siteId)
                    .gte('timestamp', monthStart)
                    .limit(10000);

                if (sessions) {
                    const uniqueSessions = new Set(sessions.map(s => s.session_id));
                    totalSessions += uniqueSessions.size;
                }
            }
        }

        // ========================================
        // HEATMAPS: Count "Created/Saved Snapshots"
        // (Matches the "Heatmap Pages" limit definition)
        // ========================================
        const { count: totalHeatmaps, error: heatmapError } = await supabase
            .from('snapshots')
            .select('*', { count: 'exact', head: true })
            .in('site_id', userSites);

        if (heatmapError) {
            console.error('[subscription-usage] Supabase heatmap error:', heatmapError);
        }

        return NextResponse.json({
            sessions: totalSessions,
            heatmaps: totalHeatmaps || 0,
            month: now.toISOString().slice(0, 7),
            sitesCount: userSites.length,
            limits: {
                sessions: limits.sessions,
                heatmaps: limits.heatmap_pages,
                max_sites: limits.max_sites,
            },
        });

    } catch (error: unknown) {
        console.error('[subscription-usage] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }
}

