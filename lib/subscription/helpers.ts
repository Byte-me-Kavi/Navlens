/**
 * Subscription Helper Functions
 * Utilities for checking subscription status, feature access, and usage limits
 */

import { createClient } from '@/lib/supabase/server';

export async function getUserSubscription(userId: string) {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
      subscription_id,
      subscriptions (
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
          features
        )
      )
    `)
        .eq('user_id', userId)
        .single();

    if (error || !profile) {
        return null;
    }

    // Supabase returns relationships as arrays - get first subscription or null
    const subscriptions = profile.subscriptions;
    if (Array.isArray(subscriptions)) {
        return subscriptions[0] || null;
    }
    return subscriptions || null;
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

export async function checkSessionLimit(userId: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number | null;
    percentage: number;
    planName: string;
}> {
    const subscription = await getUserSubscription(userId);
    const supabase = await createClient();

    // Default to Free plan if no subscription
    let limit = 1000;
    let planName = 'Free';

    if (subscription && subscription.status === 'active') {
        // subscription_plans might be array from Supabase relation
        const subPlans = subscription.subscription_plans;
        const plan = Array.isArray(subPlans) ? subPlans[0] : subPlans;
        if (plan) {
            limit = plan.session_limit;
            planName = plan.name;
        }
    }

    // If unlimited (null limit), always allow
    if (limit === null) {
        return { allowed: true, current: 0, limit: null, percentage: 0, planName };
    }

    // Get current month's usage
    const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const { data: usage } = await supabase
        .from('usage_tracking')
        .select('sessions_count')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

    const current = usage?.sessions_count || 0;
    const percentage = (current / limit) * 100;

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
    siteId: string
): Promise<{
    success: boolean;
    limitExceeded: boolean;
    current?: number;
    limit?: number | null;
}> {
    const supabase = await createClient();
    const month = new Date().toISOString().slice(0, 7);

    // Increment session count atomically
    const { error } = await supabase.rpc('increment_session_usage', {
        p_user_id: userId,
        p_site_id: siteId,
        p_month: month,
    });

    if (error) {
        console.error('Failed to track session usage:', error);
        return { success: false, limitExceeded: false };
    }

    // Check if limit exceeded
    const { allowed, current, limit, percentage } = await checkSessionLimit(userId);

    // TODO: Send email warnings at 80%, 90%, 100%
    if (percentage >= 80 && percentage < 90) {
        // Send 80% warning email
    } else if (percentage >= 90 && percentage < 100) {
        // Send 90% warning email
    } else if (!allowed) {
        // Send limit exceeded email
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
