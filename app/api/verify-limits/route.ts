import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { getUserPlanLimits, getUsageStats } from '@/lib/usage-tracker/counter';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const clickhouse = getClickHouseClient();

        // Debug: Fetch raw subscription data to see why it falls back to free
        const { data: debugSubscription, error: debugError } = await supabase
            .from('subscriptions')
            .select(`
                id,
                status,
                user_id,
                subscription_plans (
                    name,
                    limits
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'active');

        // 1. Get Plan Limits
        const limits = await getUserPlanLimits(user.id);
        const stats = await getUsageStats(user.id);

        // 2. Get Site Count (Supabase)
        const { count: siteCount } = await supabase
            .from('sites')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // 3. Get Heatmap Pages Count (ClickHouse)
        // We need to check per-site, so fetching all sites first
        const { data: sites } = await supabase
            .from('sites')
            .select('id, site_name')
            .eq('user_id', user.id);

        const heatmapPagesPerSite = [];
        let totalHeatmapPages = 0;
        let heatmapError = null;

        try {
            if (sites && sites.length > 0) {
                for (const site of sites) {
                    const query = `
                        SELECT COUNT(DISTINCT page_path) as count
                        FROM events
                        WHERE site_id = {siteId:String}
                          AND page_path IS NOT NULL
                          AND page_path != ''
                    `;
                    const result = await clickhouse.query({
                        query,
                        query_params: { siteId: site.id },
                        format: 'JSON'
                    });
                    const json = await result.json();
                    const count = (json.data?.[0] as { count: number })?.count || 0;

                    heatmapPagesPerSite.push({
                        siteId: site.id,
                        siteName: site.site_name,
                        count
                    });
                    totalHeatmapPages += count;
                }
            }
        } catch (error) {
            console.error('ClickHouse connection failed:', error);
            heatmapError = 'Analytics DB unreachable';
        }

        // 4. Construct Report
        const report = {
            userId: user.id,
            email: user.email,
            rawDebug: {
                subscription: debugSubscription,
                error: debugError
            },
            plan: {
                name: 'Detected from Limits', // Ideally fetch from subscription table for name
                limits: limits
            },
            usage: {
                sites: siteCount || 0,
                sessions: stats?.sessions_this_month || 0,
                recordings: stats?.recordings_count || 0,
                heatmapPages: {
                    total: totalHeatmapPages,
                    breakdown: heatmapPagesPerSite,
                    error: heatmapError
                }
            },
            status: {
                sites: {
                    limit: limits.max_sites,
                    isExceeded: limits.max_sites !== -1 && (siteCount || 0) >= limits.max_sites,
                    remaining: limits.max_sites === -1 ? 'Unlimited' : Math.max(0, limits.max_sites - (siteCount || 0))
                },
                sessions: {
                    limit: limits.sessions,
                    isExceeded: limits.sessions !== -1 && (stats?.sessions_this_month || 0) >= limits.sessions,
                    percentage: limits.sessions > 0 ? ((stats?.sessions_this_month || 0) / limits.sessions * 100).toFixed(1) + '%' : '0%'
                },
                recordings: {
                    limit: limits.recordings,
                    isExceeded: limits.recordings !== -1 && (stats?.recordings_count || 0) >= limits.recordings,
                    percentage: limits.recordings > 0 ? ((stats?.recordings_count || 0) / limits.recordings * 100).toFixed(1) + '%' : '0%'
                },
                heatmapPages: {
                    limit: limits.heatmap_pages,
                    isExceeded: limits.heatmap_pages !== -1 && totalHeatmapPages >= limits.heatmap_pages,
                    note: "Calculated per site in enforcement, here showing total vs per-site limit assumption"
                }
            }
        };

        return NextResponse.json(report, { status: 200 });

    } catch (error: unknown) {
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
