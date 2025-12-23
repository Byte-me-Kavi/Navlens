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

        // Debug: Log plan limits structure
        console.log('[AdminBilling] Plans from DB:', plans.map(p => ({ name: p.name, limits: p.limits })));

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
        // Count unique sessions per site for billing purposes
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const chQuery = `
            SELECT site_id, uniq(session_id) as session_count, count(*) as event_count 
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

        const siteUsageMap = new Map<string, { sessions: number; events: number }>();
        usageData.forEach((row: any) => {
            siteUsageMap.set(row.site_id, {
                sessions: parseInt(row.session_count) || 0,
                events: parseInt(row.event_count) || 0
            });
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
            const usage = siteIds.reduce((sum, siteId) => {
                const siteUsage = siteUsageMap.get(siteId);
                return sum + (siteUsage?.sessions || 0);
            }, 0);
            const totalEvents = siteIds.reduce((sum, siteId) => {
                const siteUsage = siteUsageMap.get(siteId);
                return sum + (siteUsage?.events || 0);
            }, 0);

            // Parse limits json - use 'sessions' key which matches our plan config
            let limit = 0;
            if (plan?.limits && typeof plan.limits === 'object') {
                // @ts-ignore - Check for 'sessions' key (from config.ts)
                limit = plan.limits.sessions || plan.limits.events_per_month || 0;
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
                price: plan?.price_usd || 0,
                status: sub?.status || 'free',
                usage: usage,
                limit: limit,
                usage_percent: limit > 0 ? Math.round((usage / limit) * 100) : 0,
                is_churned: !!isChurned,
                churn_date: churnDate
            };
        });

        // 5. Calculate Stats
        const totalUsers = billingData.length;
        // Count ACTIVE subscriptions
        const activeSubsCount = billingData.filter(u => u.status === 'active').length;

        // Calculate MRR (Sum of prices for active users)
        // @ts-ignore
        const mrr = billingData.filter(u => u.status === 'active' && !u.is_churned).reduce((sum, u) => sum + (u.price || 0), 0);

        // Calculate Plan Breakdown
        const planCounts: Record<string, number> = {};
        billingData.filter(u => u.status === 'active' && !u.is_churned).forEach(u => {
            const name = u.plan_name || 'Unknown';
            planCounts[name] = (planCounts[name] || 0) + 1;
        });

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
                mrr: mrr,
                plan_mean: planCounts, // Return breakdown
                plan_counts: planCounts,
                over_limit: overLimitUsers,
                recent_churn_count: recentChurns.length
            }
        });

    } catch (error: any) {
        console.error('[AdminBilling] Aggregate Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
