'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { PLANS, PlanConfig } from '@/lib/plans/config';

interface SubscriptionContextType {
  plan: PlanConfig;
  isLoading: boolean;
  hasFeature: (featureKey: string) => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<PlanConfig>(PLANS.FREE);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlan(PLANS.FREE);
        setIsLoading(false);
        return;
      }

      // Fetch subscription data
      // Fetch subscription data directly
      const { data: directSub } = await supabase
        .from('subscriptions')
        .select(`
          id, status, current_period_end,
          subscription_plans (name)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const activeSubscription = directSub;
      let planName = 'Free';

      if (activeSubscription) {
        // Handle array or single object response
        const sub = Array.isArray(activeSubscription) ? activeSubscription[0] : activeSubscription;
        
        // Check if status is active or trialing AND not expired
        // Note: We respect the server-side status, but also check date for trial expiry
        const now = new Date();
        const endDate = sub.current_period_end ? new Date(sub.current_period_end) : null;
        const isExpired = endDate && endDate < now;

        if ((sub.status === 'active' || sub.status === 'trialing') && !isExpired) {
            const plans = sub.subscription_plans;
            // Handle if plans is array or object
            const planData = Array.isArray(plans) ? plans[0] : plans;
            const rawName = planData?.name || 'Free';
            // Normalize plan name to match config keys (FREE, STARTER, PRO, ENTERPRISE)
            planName = rawName.toUpperCase();
        }
      }

      // Default to FREE if plan not found or invalid
      // @ts-expect-error - dynamic key access
      const configPlan = PLANS[planName] || PLANS.FREE;
      setPlan(configPlan);

    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setPlan(PLANS.FREE);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
    
    // Listen for auth changes to re-fetch
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        fetchSubscription();
    });

    return () => {
        subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFeature = (featureKey: string) => {
    return plan.features.includes(featureKey);
  };

  const value = useMemo(() => ({
    plan,
    isLoading,
    hasFeature,
    refreshSubscription: fetchSubscription
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [plan, isLoading]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
