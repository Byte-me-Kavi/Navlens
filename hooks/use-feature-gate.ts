import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { PLANS, PlanConfig, PlanTier } from '@/lib/plans/config';

interface UseFeatureGateReturn {
    isLoading: boolean;
    hasFeature: boolean;
    hasLimitRemaining: boolean;
    tier: PlanTier;
    limit: number;
    usage: number;
    upgradeTier: PlanTier | null;
}

export function useFeatureGate(
    featureKey: string,
    limitKey?: keyof PlanConfig['limits']
): UseFeatureGateReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [tier, setTier] = useState<PlanTier>('FREE');
    const [usage, setUsage] = useState(0);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        let isMounted = true;

        async function checkAccess() {
            try {
                // 1. Get User Session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    if (isMounted) setIsLoading(false);
                    return;
                }

                // 2. Fetch Subscription
                const { data: profile } = await supabase
                    .from('profiles')
                    .select(`
                        subscription:subscriptions(
                            status,
                            plan:subscription_plans(name)
                        )
                    `)
                    .eq('user_id', session.user.id)
                    .single();

                // Determine Tier
                let currentTier: PlanTier = 'FREE';

                // Handle potential array or single object response from Supabase join
                const subData = profile?.subscription;
                const sub = Array.isArray(subData) ? subData[0] : subData;

                if (sub?.status === 'active' || sub?.status === 'trialing') {
                    // @ts-expect-error - Supabase type inference is tricky with nested joins
                    const planName = sub.plan?.name?.toUpperCase();
                    if (planName && planName in PLANS) {
                        currentTier = planName as PlanTier;
                    }
                }

                if (isMounted) setTier(currentTier);

                // 3. If limit check required, fetch usage
                if (limitKey) {
                    const res = await fetch('/api/subscription-usage');
                    if (res.ok) {
                        const data = await res.json();
                        let currentUsage = 0;
                        if (limitKey === 'sessions') currentUsage = data.sessions;
                        else if (limitKey === 'recordings') currentUsage = data.recordings;
                        // For other keys like active_experiments, we would need specific endpoints

                        if (isMounted) setUsage(currentUsage);
                    }
                }

            } catch (error) {
                console.error('Feature gate error:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        checkAccess();

        return () => { isMounted = false; };
    }, [featureKey, limitKey, supabase]);

    const planConfig = PLANS[tier];
    const hasFeature = planConfig.features.includes(featureKey);

    let hasLimitRemaining = true;
    let limit = 0;

    if (limitKey) {

        limit = planConfig.limits[limitKey] ?? 0;
        if (limit !== -1 && usage >= limit) {
            hasLimitRemaining = false;
        }
    }

    // Determine next upgrade tier
    let upgradeTier: PlanTier | null = null;
    if (!hasFeature || !hasLimitRemaining) {
        if (tier === 'FREE') upgradeTier = 'STARTER';
        else if (tier === 'STARTER') upgradeTier = 'PRO';
        else if (tier === 'PRO') upgradeTier = 'ENTERPRISE';
    }

    return {
        isLoading,
        hasFeature,
        hasLimitRemaining,
        tier,
        limit,
        usage,
        upgradeTier
    };
}
