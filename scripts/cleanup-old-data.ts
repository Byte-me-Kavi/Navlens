#!/usr/bin/env ts-node

/**
 * Data Retention Cleanup Script
 * 
 * Deletes data older than each user's retention period based on their subscription plan.
 * Should be run daily via cron job.
 * 
 * Usage: ts-node scripts/cleanup-old-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { getClickHouseClient } from '../lib/clickhouse';

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
    console.log('[cleanup] Fetching user retention policies...');

    // Query subscriptions directly (profiles table removed)
    const { data: subscriptions, error } = await supabaseAdmin
        .from('subscriptions')
        .select(`
            user_id,
            status,
            subscription_plans (
                name,
                limits
            )
        `)
        .eq('status', 'active');

    if (error) {
        console.error('[cleanup] Error fetching subscriptions:', error);
        return [];
    }

    const retentionPolicies: UserRetention[] = [];

    for (const sub of subscriptions || []) {
        let retentionDays = 3; // Default (Free plan)

        if (sub?.subscription_plans) {
            const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
            const limits = plan.limits as Record<string, unknown>;

            if (limits?.retention_days !== undefined) {
                retentionDays = limits.retention_days as number;
            } else {
                // Fallback based on plan name
                const planName = plan.name?.toLowerCase() || '';
                if (planName.includes('starter')) retentionDays = 30;
                else if (planName.includes('pro')) retentionDays = 90;
                else if (planName.includes('enterprise')) retentionDays = 365;
            }
        }

        retentionPolicies.push({
            user_id: sub.user_id,
            retention_days: retentionDays
        });
    }

    return retentionPolicies;
}

async function cleanupClickHouseData(policies: UserRetention[]): Promise<void> {
    console.log('[cleanup] Cleaning up ClickHouse data...');

    for (const policy of policies) {
        try {
            // Get all sites for this user
            const { data: sites } = await supabaseAdmin
                .from('sites')
                .select('id')
                .eq('user_id', policy.user_id);

            if (!sites || sites.length === 0) {
                continue;
            }

            const siteIds = sites.map(s => s.id);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
            const cutoffISO = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format

            // Delete old events (ClickHouse uses ALTER TABLE DELETE for mutations)
            for (const siteId of siteIds) {
                const deleteQuery = `
                    ALTER TABLE events DELETE
                    WHERE site_id = '${siteId}'
                      AND timestamp < '${cutoffISO}'
                `;

                await clickhouse.command({ query: deleteQuery });
                console.log(`[cleanup] Deleted events older than ${cutoffISO} for site ${siteId} (user ${policy.user_id}, retention: ${policy.retention_days} days)`);
            }

        } catch (error) {
            console.error(`[cleanup] Error cleaning up data for user ${policy.user_id}:`, error);
        }
    }
}

async function cleanupSupabaseData(policies: UserRetention[]): Promise<void> {
    console.log('[cleanup] Cleaning up Supabase data...');

    for (const policy of policies) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);
            const cutoffISO = cutoffDate.toISOString();

            // Delete old session recordings/replays
            const { data: sites } = await supabaseAdmin
                .from('sites')
                .select('id')
                .eq('user_id', policy.user_id);

            if (!sites || sites.length === 0) {
                continue;
            }

            const siteIds = sites.map(s => s.id);

            // Clean up rrweb_events (session recordings)
            const { error: rrwebError } = await supabaseAdmin
                .from('rrweb_events')
                .delete()
                .in('site_id', siteIds)
                .lt('timestamp', cutoffISO);

            if (rrwebError) {
                console.error(`[cleanup] Error deleting rrweb_events for user ${policy.user_id}:`, rrwebError);
            } else {
                console.log(`[cleanup] Deleted session recordings older than ${cutoffISO} for user ${policy.user_id}`);
            }

        } catch (error) {
            console.error(`[cleanup] Error cleaning up Supabase data for user ${policy.user_id}:`, error);
        }
    }
}

async function main() {
    console.log('==============================================');
    console.log('Data Retention Cleanup Script');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('==============================================\n');

    try {
        // Get retention policies for all users
        const policies = await getUserRetentionPolicies();
        console.log(`[cleanup] Found ${policies.length} users with retention policies\n`);

        // Cleanup ClickHouse data (events)
        await cleanupClickHouseData(policies);

        // Cleanup Supabase data (sessions, recordings)
        await cleanupSupabaseData(policies);

        console.log('\n==============================================');
        console.log('Cleanup completed successfully');
        console.log(`Finished at: ${new Date().toISOString()}`);
        console.log('==============================================');

    } catch (error) {
        console.error('[cleanup] Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
main();
