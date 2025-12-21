"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface SubscriptionFeatureResult {
    hasAccess: boolean;
    loading: boolean;
    planName: string;
    error: string | null;
}

/**
 * Client-side hook to check if user has access to a specific feature
 * based on their subscription plan.
 * 
 * Queries subscriptions table directly by user_id (not through profiles).
 */
export function useSubscriptionFeature(featureName: string): SubscriptionFeatureResult {
    const [hasAccess, setHasAccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [planName, setPlanName] = useState("Free");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkFeatureAccess() {
            try {
                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                // Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError || !user) {
                    // Not logged in - no access
                    setHasAccess(false);
                    setLoading(false);
                    return;
                }

                // Query subscriptions directly by user_id (not through profiles)
                const { data: subscriptions, error: subError } = await supabase
                    .from("subscriptions")
                    .select(`
                        status,
                        subscription_plans (
                            name,
                            features
                        )
                    `)
                    .eq("user_id", user.id)
                    .eq("status", "active")
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (subError) {
                    console.error("[useSubscriptionFeature] Subscription query error:", subError);
                    // Fall back to Free plan features
                    await checkFreePlanFeature(supabase, featureName, setHasAccess, setPlanName);
                    setLoading(false);
                    return;
                }

                // Check if user has an active subscription
                const subscription = subscriptions?.[0];

                if (!subscription) {
                    // No active subscription - check Free plan features
                    await checkFreePlanFeature(supabase, featureName, setHasAccess, setPlanName);
                    setLoading(false);
                    return;
                }

                // Get plan features
                const subPlans = subscription.subscription_plans;
                const plan = Array.isArray(subPlans) ? subPlans[0] : subPlans;

                if (!plan) {
                    await checkFreePlanFeature(supabase, featureName, setHasAccess, setPlanName);
                    setLoading(false);
                    return;
                }

                const features = plan.features as Record<string, unknown> | null;
                const hasFeature = features?.[featureName] === true;

                setHasAccess(hasFeature);
                setPlanName(plan.name || "Unknown");
                setLoading(false);
            } catch (err) {
                console.error("[useSubscriptionFeature] Error:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
                setHasAccess(false);
                setLoading(false);
            }
        }

        checkFeatureAccess();
    }, [featureName]);

    return { hasAccess, loading, planName, error };
}

/**
 * Helper to check Free plan features
 */
async function checkFreePlanFeature(
    supabase: ReturnType<typeof createBrowserClient>,
    featureName: string,
    setHasAccess: (v: boolean) => void,
    setPlanName: (v: string) => void
) {
    const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("features")
        .eq("name", "Free")
        .single();

    const freeFeatures = freePlan?.features as Record<string, unknown> | null;
    const hasFeature = freeFeatures?.[featureName] === true;

    setHasAccess(hasFeature);
    setPlanName("Free");
}
