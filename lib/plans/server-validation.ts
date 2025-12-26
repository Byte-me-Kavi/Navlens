import { createClient } from '@supabase/supabase-js';
import { PLANS, PlanTier } from './config';

// Helper to access Supabase Admin logic safely
// Note: This should ONLY be used in server contexts (API/Server Actions)
const getAdminSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};

export async function getUserPlan(userId: string): Promise<PlanTier> {
    const supabase = getAdminSupabase();

    // Fetch user's subscription
    const { data: subData, error } = await supabase
        .from('subscriptions')
        .select(`
            *,
            subscription_plans (
                name,
                limits
            )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

    if (error || !subData) {
        return 'FREE'; // Default to Free if no active sub
    }

    // Handle array or object response from Supabase relations
    const plan = Array.isArray(subData.subscription_plans)
        ? subData.subscription_plans[0]
        : subData.subscription_plans;

    const planName = plan?.name?.toUpperCase() || 'FREE';
    return planName as PlanTier;
}

export async function validateFeatureAccess(userId: string, featureId: string): Promise<boolean> {
    const planTier = await getUserPlan(userId);

    const planConfig = PLANS[planTier] || PLANS.FREE;

    // Check if feature is in the plan's feature list
    return planConfig.features.includes(featureId);
}

export async function validateLimit(userId: string, limitKey: string, currentUsage: number): Promise<boolean> {
    const planTier = await getUserPlan(userId);
    const planConfig = PLANS[planTier] || PLANS.FREE;

    // @ts-expect-error - limitKey is generic string, strict keyof check fails
    const limit = planConfig.limits[limitKey];

    if (limit === -1 || limit === null || limit === undefined) {
        return true; // Unlimited
    }

    return currentUsage < limit;
}
