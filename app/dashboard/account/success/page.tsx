"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { PLANS, PlanTier, FEATURE_LABELS } from "@/lib/plans/config";

// --- Helper Functions ---

function getPlanConfig(planNameOrId: string | undefined): { name: string; features: string[]; description: string } {
  if (!planNameOrId) {
    // Fallback default
    return {
      name: "Premium",
      features: [
        "Full premium access",
        "Session recordings",
        "Heatmap analytics",
        "Priority support",
      ],
      description: "Your subscription is now active. You have full access to all premium features."
    };
  }

  // Normalize input
  const normalized = planNameOrId.toUpperCase();
  
  // Find matching plan in PLANS config
  const planKey = Object.keys(PLANS).find(key => 
    key === normalized || 
    PLANS[key as PlanTier].name.toUpperCase() === normalized ||
    PLANS[key as PlanTier].id === planNameOrId.toLowerCase()
  ) as PlanTier | undefined;

  const plan = planKey ? PLANS[planKey] : null;

  if (plan) {
    // Convert feature keys to readable labels
    const displayFeatures = plan.features
      .map(key => FEATURE_LABELS[key] || key) // Fallback to key if label missing
      .slice(0, 8); // Limit to top 8 for UI balance

    return {
      name: plan.name,
      features: displayFeatures,
      description: plan.description || `Welcome to ${plan.name}!`
    };
  }

  // Generic fallback if plan not found in config
  return {
    name: planNameOrId || "Premium",
    features: [
      "Full premium access",
      "Session recordings",
      "Heatmap analytics",
      "Priority support",
    ],
    description: "Your subscription is now active."
  };
}

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [planName, setPlanName] = useState<string>("");
  const retryCount = useRef(0);
  const MAX_RETRIES = 5;

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // Helper to log errors safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logError = (msg: string, err: any) => {
        try {
            console.error(msg, err instanceof Error ? err.message : JSON.stringify(err));
        } catch {
            console.error(msg, err);
        }
    };

    async function checkSubscription() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (isMounted) router.push("/login");
          return;
        }

        console.log(`🔄 Checking subscription (Attempt ${retryCount.current + 1}/${MAX_RETRIES})...`);

        // 1. Try to fetch existing active subscription first
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(`
            subscription_id,
            subscriptions (
              id,
              status,
              plan_id,
              subscription_plans (
                name,
                id
              )
            )
          `)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profileError) {
            logError("Error fetching profile:", profileError);
        }

        let confirmedPlanName = "";

        // Check if we already have an active subscription linked
        if (profile?.subscriptions) {
            const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
            if (sub?.status === 'active') {
                const p = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
                confirmedPlanName = p?.name || "";
                console.log("✅ Found active subscription:", confirmedPlanName);
            }
        }

        // 2. If no active subscription found, try the confirm endpoint (force sync with PayHere)
        if (!confirmedPlanName && orderId) {
             try {
                console.log('🔄 Calling confirmation API...');
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
                    if (result.success && result.subscription) {
                         const p = result.subscription.subscription_plans;
                         const planObj = Array.isArray(p) ? p[0] : p;
                         confirmedPlanName = planObj?.name || "";
                         console.log("✅ API confirmed subscription:", confirmedPlanName);
                    }
                }
             } catch (apiErr) {
                 logError("API confirm error:", apiErr);
             }
        }

        if (confirmedPlanName) {
            if (isMounted) {
                setPlanName(confirmedPlanName);
                setStatus("success");
            }
            return;
        }

        // 3. Retry logic if not found yet
        if (retryCount.current < MAX_RETRIES) {
            retryCount.current++;
            console.log(`⏳ Subscription not active yet, retrying in 2s...`);
            timeoutId = setTimeout(checkSubscription, 2000);
        } else {
             console.warn("⚠️ Max retries reached, could not find active subscription.");
             // Show success anyway to not block user, default to generic view
             if (isMounted) {
                 setStatus("success"); 
             }
        }

      } catch (err) {
        logError("Unexpected error in checkSubscription:", err);
        if (isMounted) setStatus("success"); // Fallback to show page
      }
    }

    // Start check
    checkSubscription();

    return () => {
        isMounted = false;
        if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, supabase, orderId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finalizing your upgrade...</p>
        </div>
      </div>
    );
  }

  // Derive display details
  const planDetails = getPlanConfig(planName);

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
              {planDetails.name}!
            </span>
          </h1>
          
          <p className="text-gray-600 text-lg mb-8">
            {planDetails.description}
          </p>

          {/* Features Unlocked */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
              {planDetails.name} Features Unlocked
            </h3>
            <ul className="space-y-2">
              {planDetails.features.map((feature, idx) => (
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
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              <RocketLaunchIcon className="w-5 h-5" />
              Go to Dashboard
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions? Contact us at{" "}
          <a href="mailto:navlensanalytics@gmail.com" className="text-blue-600 hover:underline">
            navlensanalytics@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
