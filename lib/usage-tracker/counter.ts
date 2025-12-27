/**
 * Session and Recording Usage Tracker
 * 
 * Utilities for tracking and enforcing session/recording limits
 */

import { createClient } from '@supabase/supabase-js';
import { PlanLimit } from '@/lib/plans/config';
import { mergeLimitsWithFallback, FREE_PLAN_DEFAULTS } from '@/lib/plans/limits';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UsageStats {
    sessions_this_month: number;
    recordings_count: number;
    period_start: string;
}

// Re-export PlanLimit as PlanLimits for backward compatibility within this file
type PlanLimits = Pick<PlanLimit, 'sessions' | 'recordings' | 'max_sites' | 'heatmap_pages'> & {
    sessions: number;
    recordings: number;
    max_sites: number;
    heatmap_pages: number;
};

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
                recordings_count: 0, // Reset recordings too
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
    // Query subscriptions directly, matching lib/subscription/helpers.ts pattern
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select(`
            status,
            subscription_plans (
                name,
                limits
            )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

    // Default limits (Free plan) - using centralized defaults
    const limits: PlanLimits = {
        sessions: FREE_PLAN_DEFAULTS.sessions,
        recordings: FREE_PLAN_DEFAULTS.recordings,
        max_sites: FREE_PLAN_DEFAULTS.max_sites,
        heatmap_pages: FREE_PLAN_DEFAULTS.heatmap_pages
    };

    if (subscription) {
        const sub = subscription;
        if (sub.subscription_plans) {
            const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
            const planName = plan.name || '';
            const planLimits = plan.limits as Partial<PlanLimit> | null;

            // Use centralized merge function for consistent fallbacks
            const merged = mergeLimitsWithFallback(planLimits, planName);
            limits.sessions = merged.sessions;
            limits.recordings = merged.recordings;
            limits.max_sites = merged.max_sites;
            limits.heatmap_pages = merged.heatmap_pages;
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
