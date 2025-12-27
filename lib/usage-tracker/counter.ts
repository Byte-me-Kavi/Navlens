/**
 * Session and Recording Usage Tracker
 * 
 * Utilities for tracking and enforcing session/recording limits
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UsageStats {
    sessions_this_month: number;
    recordings_count: number;
    period_start: string;
}

interface PlanLimits {
    sessions: number;
    recordings: number;
}

/**
 * Get or create usage stats for a user
 */
export async function getUsageStats(userId: string): Promise<UsageStats | null> {
    // Try to get existing stats
    const { data, error } = await supabaseAdmin
        .from('user_usage_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('[usage] Error fetching stats:', error);
        return null;
    }

    if (!data) {
        // Create new stats record
        const { data: newStats, error: insertError } = await supabaseAdmin
            .from('user_usage_stats')
            .insert({
                user_id: userId,
                sessions_this_month: 0,
                recordings_count: 0,
                period_start: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('[usage] Error creating stats:', insertError);
            return null;
        }

        return newStats as UsageStats;
    }

    // Check if period needs reset (monthly)
    const periodStart = new Date(data.period_start);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart >= 30) {
        // Reset monthly counter
        const { data: resetData, error: resetError } = await supabaseAdmin
            .from('user_usage_stats')
            .update({
                sessions_this_month: 0,
                period_start: now.toISOString(),
                updated_at: now.toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (resetError) {
            console.error('[usage] Error resetting stats:', resetError);
            return data as UsageStats;
        }

        return resetData as UsageStats;
    }

    return data as UsageStats;
}

/**
 * Get user's plan limits
 */
export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select(`
            subscriptions (
                status,
                subscription_plans (
                    limits
                )
            )
        `)
        .eq('user_id', userId)
        .single();

    // Default limits (Free plan)
    const limits: PlanLimits = { sessions: 500, recordings: 50 };

    if (profile?.subscriptions) {
        const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
        if (sub?.status === 'active' && sub?.subscription_plans) {
            const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
            const planLimits = plan.limits as { sessions?: number; recordings?: number } | null;

            if (planLimits) {
                limits.sessions = planLimits.sessions !== undefined ? planLimits.sessions : 500;
                limits.recordings = planLimits.recordings !== undefined ? planLimits.recordings : 50;
            }
        }
    }

    return limits;
}

/**
 * Check if user can start a new session
 */
export async function canStartSession(userId: string): Promise<{ allowed: boolean; error?: string; current?: number; limit?: number }> {
    const stats = await getUsageStats(userId);
    if (!stats) {
        return { allowed: false, error: 'Failed to fetch usage stats' };
    }

    const limits = await getUserPlanLimits(userId);

    // -1 means unlimited
    if (limits.sessions === -1) {
        return { allowed: true };
    }

    if (stats.sessions_this_month >= limits.sessions) {
        return {
            allowed: false,
            error: `Monthly session limit reached. You've used ${stats.sessions_this_month} of ${limits.sessions} sessions. Upgrade your plan for more.`,
            current: stats.sessions_this_month,
            limit: limits.sessions
        };
    }

    return { allowed: true, current: stats.sessions_this_month, limit: limits.sessions };
}

/**
 * Increment session counter atomically checking limit
 */
export async function incrementSessionCount(userId: string, limit: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin.rpc('increment_session_count', {
        p_user_id: userId,
        p_limit: limit
    });

    if (error) {
        // Parse custom exception
        if (error.message.includes('Session limit reached')) {
            return { success: false, error: 'Session limit reached' };
        }
        console.error('[usage] Error incrementing session count:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * Check if user can create a new recording
 */
export async function canCreateRecording(userId: string): Promise<{ allowed: boolean; error?: string; current?: number; limit?: number }> {
    const stats = await getUsageStats(userId);
    if (!stats) {
        return { allowed: false, error: 'Failed to fetch usage stats' };
    }

    const limits = await getUserPlanLimits(userId);

    // -1 means unlimited
    if (limits.recordings === -1) {
        return { allowed: true };
    }

    if (stats.recordings_count >= limits.recordings) {
        return {
            allowed: false,
            error: `Recording limit reached. You've used ${stats.recordings_count} of ${limits.recordings} recordings. Upgrade your plan for more.`,
            current: stats.recordings_count,
            limit: limits.recordings
        };
    }

    return { allowed: true, current: stats.recordings_count, limit: limits.recordings };
}

/**
 * Increment recording counter atomically checking limit
 */
export async function incrementRecordingCount(userId: string, limit: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabaseAdmin.rpc('increment_recording_count', {
        p_user_id: userId,
        p_limit: limit
    });

    if (error) {
        if (error.message.includes('Recording limit reached')) {
            return { success: false, error: 'Recording limit reached' };
        }
        console.error('[usage] Error incrementing recording count:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}
