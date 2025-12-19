"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import {
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

// Plan-specific features configuration
const planFeatures: Record<string, string[]> = {
  Starter: [
    '5,000 sessions per month',
    'Unlimited heatmaps',
    'Full session recordings',
    '1-month data retention',
    'Email support',
    'A/B testing (2 experiments)',
  ],
  Pro: [
    '25,000 sessions per month',
    'Revenue attribution',
    'AI insights (weekly)',
    'Funnel & form analytics',
    'Error tracking',
    '3-month data retention',
    'Priority support',
  ],
  Enterprise: [
    'Unlimited sessions',
    'Revenue heatmaps',
    'API monitoring',
    'SSO/SAML integration',
    '1-year data retention',
    'Dedicated account manager',
    'Custom integrations',
  ],
};

// Plan-specific welcome messages
const planMessages: Record<string, string> = {
  Starter: 'Perfect for small websites - essential analytics tools are now yours.',
  Pro: 'Advanced insights unlocked - AI-powered analytics and priority support await.',
  Enterprise: 'Enterprise-grade analytics with unlimited capabilities activated.',
};

// Get features for a plan with fallback
const getFeaturesForPlan = (planName: string): string[] => {
  return planFeatures[planName] || [
    'Full premium access',
    'Session recordings',
    'Heatmap analytics',
    'Priority support',
  ];
};

// Get message for a plan with fallback
const getMessageForPlan = (planName: string): string => {
  return planMessages[planName] || 'Your subscription is now active. You have full access to all premium features.';
};

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [subscription, setSubscription] = useState<any>(null);
  const [planName, setPlanName] = useState<string>("");

  useEffect(() => {
    async function confirmAndCheckSubscription() {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/login");
          return;
        }

        console.log('🔄 Confirming subscription for order:', orderId);

        // Call the confirm API to activate pending subscription
        // This handles cases where PayHere webhook can't reach localhost
        try {
          const confirmResponse = await fetch('/api/payhere/confirm-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ orderId }),
          });

          if (confirmResponse.ok) {
            const result = await confirmResponse.json();
            console.log('✅ Subscription confirmed:', result);
            
            if (result.subscription?.subscription_plans) {
              const plans = result.subscription.subscription_plans;
              const plan = Array.isArray(plans) ? plans[0] : plans;
              setPlanName(plan?.name || 'Premium');
            }
          } else {
            console.log('⚠️ Confirm response not OK, checking existing subscription');
          }
        } catch (confirmError) {
          console.error('Confirm API error:', confirmError);
        }

        // Check subscription status
        const { data: profile, error } = await supabase
          .from("profiles")
          .select(`
            subscription_id,
            subscriptions (
              id,
              status,
              plan_id,
              subscription_plans (
                name
              )
            )
          `)
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching subscription:", error);
          setStatus("success");
          setPlanName(planName || "Premium");
          return;
        }

        if (profile?.subscriptions) {
          const sub = Array.isArray(profile.subscriptions) 
            ? profile.subscriptions[0] 
            : profile.subscriptions;
          
          setSubscription(sub);
          
          if (sub?.status === 'active') {
            const plans = sub?.subscription_plans;
            const plan = Array.isArray(plans) ? plans[0] : plans;
            setPlanName(plan?.name || "Premium");
          }
        }

        setStatus("success");

      } catch (error) {
        console.error("Error checking subscription:", error);
        setStatus("success");
        setPlanName("Premium");
      }
    }

    // Small delay before confirming
    const timer = setTimeout(() => {
      confirmAndCheckSubscription();
    }, 1000);

    return () => clearTimeout(timer);
  }, [router, supabase, orderId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-lg w-full">
        {/* Success Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-purple-200">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="relative inline-flex">
              <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircleIcon className="w-14 h-14 text-white" />
              </div>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {planName}!
            </span>
          </h1>
          
          <p className="text-gray-600 text-lg mb-8">
            {getMessageForPlan(planName)}
          </p>

          {/* Features Unlocked */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
              {planName} Features Unlocked
            </h3>
            <ul className="space-y-2">
              {getFeaturesForPlan(planName).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-700">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Order ID */}
          {orderId && (
            <p className="text-xs text-gray-500 mb-6">
              Order ID: <code className="bg-gray-100 px-2 py-1 rounded">{orderId}</code>
            </p>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <RocketLaunchIcon className="w-5 h-5" />
              Go to Dashboard
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            
            <Link
              href="/dashboard/subscription"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-all"
            >
              Manage Subscription
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions? Contact us at{" "}
          <a href="mailto:support@navlens.com" className="text-blue-600 hover:underline">
            support@navlens.com
          </a>
        </p>
      </div>
    </div>
  );
}
