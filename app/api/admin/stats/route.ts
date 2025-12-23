import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server-admin';
import { getClickHouseClient } from '@/lib/clickhouse';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Security Check: Verify Admin Session
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Initialize Clients
        const supabase = createClient();
        const clickhouse = getClickHouseClient();

        // 3. Fetch Data with granular error handling
        console.log('[AdminStats] Starting data fetch...');

        const results = await Promise.allSettled([
            // 0: Users
            supabase.from('profiles').select('*', { count: 'exact', head: true })
                .then(res => { if (res.error) throw res.error; return res; }),

            // 1: Sites
            supabase.from('sites').select('*', { count: 'exact', head: true })
                .then(res => { if (res.error) throw res.error; return res; }),

            // 2: Events Total
            clickhouse.query({
                query: `SELECT count(*) as count FROM events`,
                format: 'JSONEachRow'
            }).then(res => res.json()),

            // 3: Events Chart
            clickhouse.query({
                query: `
            SELECT 
                toDate(timestamp) as date, 
                count(*) as count 
            FROM events 
            WHERE timestamp >= now() - INTERVAL 30 DAY 
            GROUP BY date 
            ORDER BY date
        `,
                format: 'JSONEachRow'
            }).then(res => res.json()),

            // 4: Recent Users
            supabase.auth.admin.listUsers({
                page: 1,
                perPage: 5,
            }).then(res => { if (res.error) throw res.error; return res; }),

            // 5: Plan Distribution
            supabase.from('subscriptions')
                .select('status, plan:subscription_plans(name)')
                .in('status', ['active', 'trialing'])
                .then(res => { if (res.error) throw res.error; return res; })
        ]);

        // Debug Logging
        results.forEach((res, idx) => {
            if (res.status === 'rejected') {
                console.error(`[AdminStats] Query ${idx} failed:`, res.reason);
            }
        });

        // Extract Data (Safe Fallbacks)
        const usersRes = results[0].status === 'fulfilled' ? results[0].value : { count: 0 };
        const sitesRes = results[1].status === 'fulfilled' ? results[1].value : { count: 0 };
        const eventsTotalRes = results[2].status === 'fulfilled' ? results[2].value : [{ count: 0 }];
        const eventsChartRes = results[3].status === 'fulfilled' ? results[3].value : [];
        const recentUsersRes = results[4].status === 'fulfilled' ? results[4].value : { data: { users: [] } };
        const subsRes = results[5].status === 'fulfilled' ? results[5].value : { data: [] };

        // Process Counts
        // Use Auth Total if available (more accurate for "Signups"), otherwise profiles count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentUsersData = recentUsersRes as any;
        const totalUsers = recentUsersData.data?.total || recentUsersData.total || usersRes.count || 0;

        const totalSites = sitesRes.count ?? 0;
        const eventsData = eventsTotalRes as Array<{ count: string | number }>;
        const totalEvents = eventsData[0]?.count ? Number(eventsData[0].count) : 0;

        // Process Chart
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventsChart = (eventsChartRes as any[]).map(item => ({
            date: item.date,
            count: Number(item.count)
        }));

        // Process Plan Distribution
        const planCounts: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subs = (subsRes as any).data || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subs.forEach((s: any) => {
            const name = s.plan?.name || 'Unknown';
            planCounts[name] = (planCounts[name] || 0) + 1;
        });

        const planDistribution = Object.entries(planCounts).map(([name, value]) => ({ name, value }));
        // If empty, add a dummy free
        if (planDistribution.length === 0 && totalUsers > 0) {
            planDistribution.push({ name: 'Free', value: totalUsers });
        }

        // Process Signups
        // Cast to any to handle Supabase type mismatches gracefully during debug
        const rawUsers = recentUsersData.data?.users || recentUsersData.users || [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentSignups = rawUsers.map((user: any) => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in: user.last_sign_in_at,
            status: user.confirmed_at ? 'Active' : 'Unverified'
        }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5);

        // Calculate System Health
        const failures = results.filter(r => r.status === 'rejected').length;
        let systemHealth = 'Healthy';
        if (failures > 0 && failures < results.length) {
            systemHealth = 'Degraded';
        } else if (failures === results.length) {
            systemHealth = 'Critical';
        }

        return NextResponse.json({
            totalUsers,
            totalSites,
            totalEvents,
            recentSignups,
            eventsChart,
            planDistribution,
            systemHealth
        });

    } catch (error: unknown) {
        console.error('[AdminStats] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            error: 'Internal Server Error',
            details: message
        }, { status: 500 });
    }
}
