/**
 * Subscription Helper Functions
 * Utilities for checking subscription status, feature access, and usage limits
 */

import { createClient } from '@/lib/supabase/server';

export async function getUserSubscription(userId: string) {
    const supabase = await createClient();

    // Query subscriptions table directly by user_id (fixed from profiles lookup)
    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select(`
            id,
            status,
            start_date,
            end_date,
            current_period_end,
            cancel_at_period_end,
            subscription_plans (
                name,
                price_usd,
                price_lkr,
                session_limit,
                features,
                limits
            )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

    if (error) {
        console.error('[getUserSubscription] Error:', error);
        return null;
    }

    return subscription || null;
}

export async function hasFeatureAccess(
    userId: string,
    featureName: string
): Promise<boolean> {
    const subscription = await getUserSubscription(userId);

    // No subscription means Free tier - check Free tier features
    if (!subscription || subscription.status !== 'active') {
        // Get Free plan features
        const supabase = await createClient();
        const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('features')
            .eq('name', 'Free')
            .single();

        if (!freePlan) return false;

        const features = freePlan.features as Record<string, unknown>;
        return features[featureName] === true || features[featureName] === 'basic';
    }

    // subscription_plans might be array from Supabase relation
    const subPlans = subscription.subscription_plans;
    const plan = Array.isArray(subPlans) ? subPlans[0] : subPlans;
    if (!plan) return false;

    const features = plan.features as Record<string, unknown>;

    // Check if feature exists and is enabled
    if (typeof features[featureName] === 'boolean') {
        return features[featureName];
    }

    // For string values like "basic", "full", "limited"
    if (typeof features[featureName] === 'string') {
        return features[featureName] !== 'false';
    }

    // For numeric limits, return true if > 0
    if (typeof features[featureName] === 'number') {
        return features[featureName] > 0;
    }

    return false;
}

// Re-use logic from usage-tracker to ensure consistency
// We use the exported functions from counter.ts which treat 'user_usage_stats' as SSOT
import { getUserPlanLimits, getUsageStats } from '@/lib/usage-tracker/counter';

export async function checkSessionLimit(userId: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number | null;
    percentage: number;
    planName: string;
}> {
    const limits = await getUserPlanLimits(userId);
    const stats = await getUsageStats(userId);

    const limit = limits.sessions;
    const current = stats?.sessions_this_month || 0;

    // Plan Name for display
    let planName = 'Free';
    // We still use the local helper for subscription details as counter doesn't return plan name
    const subscription = await getUserSubscription(userId);
    if (subscription?.status === 'active') {
        const p = Array.isArray(subscription.subscription_plans) ? subscription.subscription_plans[0] : subscription.subscription_plans;
        planName = p?.name || 'Free'; // Fallback
    }

    // Unlimited check
    if (limit === -1) {
        return { allowed: true, current, limit: null, percentage: 0, planName };
    }

    const percentage = limit > 0 ? (current / limit) * 100 : 100;

    return {
        allowed: current < limit,
        current,
        limit,
        percentage,
        planName,
    };
}


export async function trackSessionUsage(
    userId: string,
    _siteId: string
): Promise<{
    success: boolean;
    limitExceeded: boolean;
    current?: number;
    limit?: number | null;
}> {
    // Get limits for incrementSessionCount
    const limits = await getUserPlanLimits(userId);

    // Increment usage using robust logic from counter.ts (Source of truth: user_usage_stats)
    // Note: incrementSessionCount handles RPC or direct update internally
    const { incrementSessionCount } = await import('@/lib/usage-tracker/counter');
    try {
        await incrementSessionCount(userId, limits.sessions);
    } catch (error) {
        console.error('Failed to track session usage:', error);
        // Don't fail the request, just log error
    }

    // Check if limit exceeded (using new logic)
    const { allowed, current, limit, percentage } = await checkSessionLimit(userId);

    // Send email warnings at 80%, 90%, 100%
    // Only send if we just crossed the threshold (previous < threshold <= current)
    if (limit && current) {
        const prevPercentage = ((current - 1) / limit) * 100;

        // Get user email for sending notifications
        const supabase = await createClient();
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;

        if (userEmail) {
            const { sendUsageWarning80Email, sendUsageWarning90Email, sendUsageLimitReachedEmail } = await import('@/lib/email/service');
            const { planName } = await checkSessionLimit(userId);

            if (percentage >= 80 && percentage < 90 && prevPercentage < 80) {
                // Just crossed 80% - send warning
                sendUsageWarning80Email(userEmail, 'sessions', current, limit, planName);
            } else if (percentage >= 90 && percentage < 100 && prevPercentage < 90) {
                // Just crossed 90% - send critical warning
                sendUsageWarning90Email(userEmail, 'sessions', current, limit, planName);
            } else if (!allowed && prevPercentage < 100) {
                // Just hit limit - send limit reached
                sendUsageLimitReachedEmail(userEmail, 'sessions', limit, planName);
            }
        }
    }

    return {
        success: true,
        limitExceeded: !allowed,
        current,
        limit,
    };
}

export async function getSubscriptionPlans() {
    const supabase = await createClient();

    const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_usd', { ascending: true });

    if (error) {
        throw new Error('Failed to fetch subscription plans');
    }

    return plans;
}
