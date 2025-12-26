import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClickHouseClient } from '@/lib/clickhouse';

/**
 * Vercel Cron Job - Data Retention Cleanup
 * Runs daily at 3 AM UTC to delete data older than each user's retention period
 * 
 * Schedule: 0 3 * * * (daily at 3:00 AM UTC)
 */

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const clickhouse = getClickHouseClient();

interface UserRetention {
    user_id: string;
    retention_days: number;
}

async function getUserRetentionPolicies(): Promise<UserRetention[]> {
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select(`
            user_id,
            subscriptions (
                status,
                subscription_plans (
                    name,
                    limits
                )
            )
        `);

    if (error) {
        console.error('[cron/cleanup] Error fetching profiles:', error);
        return [];
    }

    const retentionPolicies: UserRetention[] = [];

    for (const profile of profiles || []) {
        let retentionDays = 3; // Default (Free plan)

        if (profile.subscriptions) {
            const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
            if (sub?.status === 'active' && sub?.subscription_plans) {
                const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
                const limits = plan.limits as Record<string, unknown>;

                if (limits?.retention_days !== undefined) {
                    retentionDays = limits.retention_days as number;
                } else {
                    const planName = (plan.name as string)?.toLowerCase() || '';
                    if (planName.includes('starter')) retentionDays = 30;
                    else if (planName.includes('pro')) retentionDays = 90;
                    else if (planName.includes('enterprise')) retentionDays = 365;
                }
            }
        }

        retentionPolicies.push({
            user_id: profile.user_id,
            retention_days: retentionDays
        });
    }

    return retentionPolicies;
}

async function cleanupClickHouseData(policies: UserRetention[]): Promise<number> {
    let sitesProcessed = 0;

    for (const policy of policies) {
        try {
            const { data: sites } = await supabaseAdmin
                .from('sites')
                .select('id')
                .eq('user_id', policy.user_id);

            if (!sites || sites.length === 0) continue;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
            const cutoffISO = cutoffDate.toISOString().split('T')[0];

            for (const site of sites) {
                const deleteQuery = `
                    ALTER TABLE events DELETE
                    WHERE site_id = '${site.id}'
                      AND timestamp < '${cutoffISO}'
                `;
                await clickhouse.command({ query: deleteQuery });
                sitesProcessed++;
            }
        } catch (error) {
            console.error(`[cron/cleanup] Error for user ${policy.user_id}:`, error);
        }
    }

    return sitesProcessed;
}

async function cleanupSupabaseData(policies: UserRetention[]): Promise<number> {
    let usersProcessed = 0;

    for (const policy of policies) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
            const cutoffISO = cutoffDate.toISOString();

            const { data: sites } = await supabaseAdmin
                .from('sites')
                .select('id')
                .eq('user_id', policy.user_id);

            if (!sites || sites.length === 0) continue;

            const siteIds = sites.map(s => s.id);

            await supabaseAdmin
                .from('rrweb_events')
                .delete()
                .in('site_id', siteIds)
                .lt('timestamp', cutoffISO);

            usersProcessed++;
        } catch (error) {
            console.error(`[cron/cleanup] Error for user ${policy.user_id}:`, error);
        }
    }

    return usersProcessed;
}

export async function GET(request: Request) {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    console.log('[cron/cleanup] Starting data retention cleanup...');
    const startTime = Date.now();

    try {
        const policies = await getUserRetentionPolicies();
        const sitesProcessed = await cleanupClickHouseData(policies);
        const usersProcessed = await cleanupSupabaseData(policies);

        const duration = Date.now() - startTime;

        console.log(`[cron/cleanup] Completed in ${duration}ms. Sites: ${sitesProcessed}, Users: ${usersProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'Data retention cleanup completed',
            stats: {
                usersWithPolicies: policies.length,
                sitesProcessed,
                usersProcessed,
                durationMs: duration
            }
        });

    } catch (error) {
        console.error('[cron/cleanup] Fatal error:', error);
        return NextResponse.json(
            { error: 'Cleanup failed', details: String(error) },
            { status: 500 }
        );
    }
}
