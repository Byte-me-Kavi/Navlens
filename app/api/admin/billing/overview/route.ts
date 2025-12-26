import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';

interface UserUsageStats {
    user_id: string;
    sessions_this_month: number;
    recordings_count: number;
    period_start: string;
}

interface PlanLimits {
    sessions?: number;
    recordings?: number;
    retention_days?: number;
    active_experiments?: number;
    active_surveys?: number;
    heatmap_pages?: number;
    max_sites?: number;
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');

        if (!adminSession?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient();

        // 1. Fetch Key Data from Supabase
        const [usersRes, subsRes, plansRes, sitesRes, usageStatsRes, experimentsRes, surveysRes] = await Promise.all([
            supabase.auth.admin.listUsers({ perPage: 1000 }),
            supabase.from('subscriptions').select('*'),
            supabase.from('subscription_plans').select('*'),
            supabase.from('sites').select('id, user_id, domain'),
            supabase.from('user_usage_stats').select('*'),
            supabase.from('experiments').select('id, site_id, status'),
            supabase.from('surveys').select('id, site_id, is_active')
        ]);

        if (usersRes.error) throw usersRes.error;

        const users = usersRes.data.users;
        const subscriptions = subsRes.data || [];
        const plans = plansRes.data || [];
        const sites = sitesRes.data || [];
        const usageStats = (usageStatsRes.data || []) as UserUsageStats[];
        const experiments = experimentsRes.data || [];
        const surveys = surveysRes.data || [];

        // Get recordings count per site using RPC function (accurate DISTINCT count for current month)
        const siteRecordingsMap = new Map<string, number>();
        const siteIds = sites.map(s => s.id);

        if (siteIds.length > 0) {
            // Call RPC function for each site to get accurate recordings count
            for (const siteId of siteIds) {
                const { data: count, error: rpcErr } = await supabase
                    .rpc('get_site_recordings_count', { p_site_id: siteId });

                if (rpcErr) {
                    console.error('[AdminBilling] RPC error for site', siteId, ':', rpcErr);
                    // Fallback to simple query if RPC doesn't exist yet
                    const { data: sessions } = await supabase
                        .from('rrweb_events')
                        .select('session_id')
                        .eq('site_id', siteId)
                        .gte('timestamp', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
                        .limit(10000);

                    if (sessions) {
                        const uniqueSessions = new Set(sessions.map(s => s.session_id));
                        siteRecordingsMap.set(siteId, uniqueSessions.size);
                    }
                } else {
                    siteRecordingsMap.set(siteId, count || 0);
                }
            }
        }

        console.log('[AdminBilling] Sessions/Recordings per site (current month from Supabase):', Object.fromEntries(siteRecordingsMap));

        // NOTE: Sessions = Recordings in this context
        // Each row in sessions_view represents a unique recorded session
        // We use Supabase as single source of truth (ClickHouse removed)

        // Debug: Log plan limits structure
        console.log('[AdminBilling] Plans from DB:', plans.map(p => ({ name: p.name, limits: p.limits })));

        // 3. Map Data
        const planMap = new Map(plans.map(p => [p.id, p]));
        const userSitesMap = new Map<string, string[]>();
        const usageStatsMap = new Map<string, UserUsageStats>();

        sites.forEach(s => {
            const list = userSitesMap.get(s.user_id) || [];
            list.push(s.id);
            userSitesMap.set(s.user_id, list);
        });

        usageStats.forEach(stat => {
            usageStatsMap.set(stat.user_id, stat);
        });

        // 3. Count active experiments and surveys per user
        const userExperimentsMap = new Map<string, number>();
        const userSurveysMap = new Map<string, number>();

        experiments.filter(e => e.status === 'running').forEach(exp => {
            const site = sites.find(s => s.id === exp.site_id);
            if (site) {
                const count = userExperimentsMap.get(site.user_id) || 0;
                userExperimentsMap.set(site.user_id, count + 1);
            }
        });

        surveys.filter(s => s.is_active).forEach(survey => {
            const site = sites.find(s => s.id === survey.site_id);
            if (site) {
                const count = userSurveysMap.get(site.user_id) || 0;
                userSurveysMap.set(site.user_id, count + 1);
            }
        });

        // 4. Aggregate per User with ALL usage data
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
            let plan = planMap.get(planId);

            // Fallback logic for Free plan
            if (!plan && !sub) {
                plan = plans.find(p => p.name.toLowerCase().includes('free')) || plans[0];
            }

            // Get usage from Supabase sessions_view (single source of truth)
            const siteIds = userSitesMap.get(user.id) || [];
            const sitesCount = siteIds.length;

            // Aggregate sessions/recordings from Supabase across all user's sites
            // In our case, sessions = recordings since each sessions_view row is a recorded session
            const supabaseSessions = siteIds.reduce((sum, siteId) => {
                return sum + (siteRecordingsMap.get(siteId) || 0);
            }, 0);

            // Sessions and Recordings are the same value from sessions_view
            const userStats = usageStatsMap.get(user.id);
            const sessionsUsed = supabaseSessions > 0 ? supabaseSessions : (userStats?.sessions_this_month || 0);
            const recordingsUsed = supabaseSessions > 0 ? supabaseSessions : (userStats?.recordings_count || 0);

            // Get active experiments and surveys
            const activeExperiments = userExperimentsMap.get(user.id) || 0;
            const activeSurveys = userSurveysMap.get(user.id) || 0;

            // Get limits from plan
            const limits: PlanLimits = plan?.limits || {};
            const sessionLimit = limits.sessions || 500;
            const recordingsLimit = limits.recordings || 50;
            const maxSites = limits.max_sites || 1;
            const maxExperiments = limits.active_experiments ?? 0;
            const maxSurveys = limits.active_surveys ?? 0;
            const heatmapPagesLimit = limits.heatmap_pages || 3;
            const retentionDays = limits.retention_days || 3;

            // Status
            const isChurned = sub?.status === 'canceled' || sub?.cancel_at_period_end;
            const churnDate = sub?.canceled_at;

            // Calculate primary usage percentage (based on sessions)
            const usagePercent = sessionLimit > 0 && sessionLimit !== -1
                ? Math.round((sessionsUsed / sessionLimit) * 100)
                : 0;

            return {
                user_id: user.id,
                email: user.email,
                plan_name: plan?.name || 'Free',
                price: plan?.price_usd || 0,
                status: sub?.status || 'free',
                // Primary usage (sessions)
                usage: sessionsUsed,
                limit: sessionLimit === -1 ? 0 : sessionLimit, // 0 means unlimited for display
                usage_percent: usagePercent,
                // Detailed usage breakdown
                sessions_used: sessionsUsed,
                sessions_limit: sessionLimit,
                recordings_used: recordingsUsed,
                recordings_limit: recordingsLimit,
                sites_count: sitesCount,
                sites_limit: maxSites,
                active_experiments: activeExperiments,
                experiments_limit: maxExperiments,
                active_surveys: activeSurveys,
                surveys_limit: maxSurveys,
                heatmap_pages_limit: heatmapPagesLimit,
                retention_days: retentionDays,
                // Period info
                period_start: userStats?.period_start || null,
                is_churned: !!isChurned,
                churn_date: churnDate
            };
        });

        // 5. Calculate Stats
        const totalUsers = billingData.length;
        // Count ACTIVE subscriptions
        const activeSubsCount = billingData.filter(u => u.status === 'active').length;

        // Calculate MRR (Sum of prices for active users)
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

    } catch (error: unknown) {
        console.error('[AdminBilling] Aggregate Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
