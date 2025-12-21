import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server-admin';
import { queryWithMetrics } from '@/lib/clickhouse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient();

        // 1. Fetch Key Data
        const [usersRes, subsRes, plansRes, sitesRes] = await Promise.all([
            supabase.auth.admin.listUsers({ perPage: 1000 }),
            supabase.from('subscriptions').select('*'),
            supabase.from('subscription_plans').select('*'),
            supabase.from('sites').select('id, user_id, domain')
        ]);

        if (usersRes.error) throw usersRes.error;

        const users = usersRes.data.users;
        const subscriptions = subsRes.data || [];
        const plans = plansRes.data || [];
        const sites = sitesRes.data || [];

        // 2. Map Data
        const planMap = new Map(plans.map(p => [p.id, p]));
        const siteOwnerMap = new Map(sites.map(s => [s.id, s.user_id]));
        const userSitesMap = new Map<string, string[]>();

        sites.forEach(s => {
            const list = userSitesMap.get(s.user_id) || [];
            list.push(s.id);
            userSitesMap.set(s.user_id, list);
        });

        // 3. ClickHouse Usage Query
        // Get usage for all sites in the last 30 days (or since period start)
        // For simplicity, we query last 30 days for everyone to detect current velocity
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const chQuery = `
            SELECT site_id, count(*) as count 
            FROM events 
            WHERE timestamp >= toDateTime('${thirtyDaysAgo.slice(0, 19).replace('T', ' ')}')
            GROUP BY site_id
        `;

        let usageData: any[] = [];
        try {
            const { data } = await queryWithMetrics(chQuery, {}, 'Billing Usage Scan');
            usageData = data as any[];
        } catch (e) {
            console.error('ClickHouse Query Failed:', e);
            // Non-blocking, continue with 0 usage
        }

        const siteUsageMap = new Map<string, number>();
        usageData.forEach((row: any) => {
            siteUsageMap.set(row.site_id, parseInt(row.count));
        });

        // 4. Aggregate per User
        const billingData = users.map(user => {
            // Find all subs for user, sort by created_at desc
            const userSubs = subscriptions
                .filter(s => s.user_id === user.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Pick the latest 'active' one, or just the latest one if none active
            const activeSub = userSubs.find(s => s.status === 'active');
            const sub = activeSub || userSubs[0];

            // Default to Free plan if no sub
            const planId = sub?.plan_id;
            // Determine plan details. If no sub, assume Free but we need to find "Free" plan ID or defaults
            let plan = planMap.get(planId);

            // Fallback logic for Free plan (assuming cheapest/first is free if not found)
            if (!plan && !sub) {
                // Try to find a plan named 'Free' or 'Starter' or take the lowest price
                plan = plans.find(p => p.name.toLowerCase().includes('free')) || plans[0];
            }

            const siteIds = userSitesMap.get(user.id) || [];
            const totalEvents = siteIds.reduce((sum, siteId) => sum + (siteUsageMap.get(siteId) || 0), 0);

            // Parse limits json
            let limit = 0;
            if (plan?.limits && typeof plan.limits === 'object') {
                // @ts-ignore
                limit = plan.limits.events_per_month || 0;
            }

            // Status
            // Active: sub.status === 'active'
            // Churned: sub.status === 'canceled' && canceled_at > 30 days ago? 
            // "Churn Watch" = cancelled in last 30 days.

            const isChurned = sub?.status === 'canceled' || sub?.cancel_at_period_end;
            const churnDate = sub?.canceled_at;

            return {
                user_id: user.id,
                email: user.email,
                plan_name: plan?.name || 'Unknown',
                status: sub?.status || 'free',
                usage: totalEvents,
                limit: limit,
                usage_percent: limit > 0 ? Math.round((totalEvents / limit) * 100) : 0,
                is_churned: !!isChurned,
                churn_date: churnDate
            };
        });

        // 5. Calculate Stats
        const totalUsers = billingData.length;
        // Count ACTIVE subscriptions (status === 'active' or 'trialing' etc, but here 'active')
        const activeSubsCount = billingData.filter(u => u.status === 'active').length;

        const overLimitUsers = billingData.filter(u => u.usage > u.limit && u.limit > 0).length;
        // Churned in last 30 days
        const recentChurns = billingData.filter(u => {
            if (!u.is_churned || !u.churn_date) return false;
            const diff = Date.now() - new Date(u.churn_date).getTime();
            return diff < 30 * 24 * 60 * 60 * 1000;
        });

        return NextResponse.json({
            users: billingData,
            stats: {
                total_users: totalUsers,
                active_subs: activeSubsCount,
                over_limit: overLimitUsers,
                recent_churn_count: recentChurns.length
            }
        });

    } catch (error: any) {
        console.error('[AdminBilling] Aggregate Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
