/**
 * Subscription Dashboard
 * Manages active subscription, shows real usage from ClickHouse, and allows cancellation
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
  CheckCircleIcon,
  CreditCardIcon,
  CalendarIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  XCircleIcon,
  FireIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  subscription_plans: {
    name: string;
    price_usd: number;
    price_lkr: number;
    session_limit: number | null;
    features: Record<string, any>;
  };
}

interface UsageData {
  sessions: number;
  heatmaps: number;
  sessionLimit: number | null;
  heatmapLimit: number | null;
  planName: string;
}

// Plan configurations with limits
const planLimits: Record<string, { sessions: number | null; heatmaps: number | null }> = {
  Free: { sessions: 1000, heatmaps: 10 },
  Starter: { sessions: 5000, heatmaps: null },
  Pro: { sessions: 25000, heatmaps: null },
  Enterprise: { sessions: null, heatmaps: null },
};

const planDetails: Record<string, { description: string; features: string[]; gradient: string; icon: string }> = {
  Free: {
    description: 'Basic analytics to get you started with user behavior tracking.',
    features: [
      '1,000 sessions/month',
      'Basic heatmaps (10/day)',
      'Session replay',
      '14-day retention',
    ],
    gradient: 'from-gray-500 to-gray-600',
    icon: '🆓',
  },
  Starter: {
    description: 'Perfect for small websites and blogs with growing traffic.',
    features: [
      '5,000 sessions/month',
      'Unlimited heatmaps',
      'Full session replay',
      'A/B testing (2 tests)',
      'Email support',
    ],
    gradient: 'from-emerald-500 to-teal-600',
    icon: '🚀',
  },
  Pro: {
    description: 'Advanced insights for growing businesses and agencies.',
    features: [
      '25,000 sessions/month',
      'Revenue attribution',
      'AI insights',
      'Funnel & form analytics',
      'Priority support',
    ],
    gradient: 'from-blue-500 to-indigo-600',
    icon: '💎',
  },
  Enterprise: {
    description: 'Enterprise-grade analytics with unlimited capabilities.',
    features: [
      'Unlimited sessions',
      'Revenue heatmaps',
      'SSO/SAML',
      'Dedicated manager',
      'Custom integrations',
    ],
    gradient: 'from-purple-500 to-pink-600',
    icon: '🏢',
  },
};

export default function SubscriptionDashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch subscription data
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          subscription_id,
          subscriptions (
            id, status, start_date, current_period_end, cancel_at_period_end,
            subscription_plans (name, price_usd, price_lkr, session_limit, features)
          )
        `)
        .eq('user_id', user.id)
        .single();

      let activeSubscription = profile?.subscriptions;

      if (!activeSubscription || (Array.isArray(activeSubscription) && activeSubscription.length === 0)) {
        const { data: directSub } = await supabase
          .from('subscriptions')
          .select(`
            id, status, start_date, current_period_end, cancel_at_period_end,
            subscription_plans (name, price_usd, price_lkr, session_limit, features)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (directSub) {
          activeSubscription = directSub as any;
          await supabase.from('profiles').update({ subscription_id: directSub.id }).eq('user_id', user.id);
        }
      }

      if (activeSubscription) {
        const sub = Array.isArray(activeSubscription) ? activeSubscription[0] : activeSubscription;
        setSubscription(sub as any);
      }

      // Get plan name
      const subscriptionData = activeSubscription as any;
      const sub = Array.isArray(subscriptionData) ? subscriptionData[0] : subscriptionData;
      const planName = sub?.subscription_plans?.name || 'Free';
      const limits = planLimits[planName] || planLimits.Free;

      // Fetch real usage from API with sessionStorage caching
      const USAGE_CACHE_KEY = 'navlens_subscription_usage';
      const USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession) {
        try {
          // Check sessionStorage cache first
          const cached = sessionStorage.getItem(USAGE_CACHE_KEY);
          if (cached) {
            try {
              const { data: cachedUsage, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < USAGE_CACHE_TTL) {
                console.log('📦 Using cached subscription usage');
                setUsage({
                  sessions: cachedUsage.sessions || 0,
                  heatmaps: cachedUsage.heatmaps || 0,
                  sessionLimit: limits.sessions,
                  heatmapLimit: limits.heatmaps,
                  planName,
                });
                return; // Use cached data, skip API call
              }
            } catch {
              // Invalid cache, continue to fetch
            }
          }

          const usageRes = await fetch('/api/subscription-usage', {
            headers: { 'Authorization': `Bearer ${authSession.access_token}` },
          });
          if (usageRes.ok) {
            const usageData = await usageRes.json();
            
            // Cache the usage data in sessionStorage
            sessionStorage.setItem(USAGE_CACHE_KEY, JSON.stringify({
              data: usageData,
              timestamp: Date.now(),
            }));
            console.log('💾 Cached subscription usage');
            
            setUsage({
              sessions: usageData.sessions || 0,
              heatmaps: usageData.heatmaps || 0,
              sessionLimit: limits.sessions,
              heatmapLimit: limits.heatmaps,
              planName,
            });
          } else {
            // Fallback to 0 if API fails
            setUsage({
              sessions: 0,
              heatmaps: 0,
              sessionLimit: limits.sessions,
              heatmapLimit: limits.heatmaps,
              planName,
            });
          }
        } catch {
          setUsage({
            sessions: 0,
            heatmaps: 0,
            sessionLimit: limits.sessions,
            heatmapLimit: limits.heatmaps,
            planName,
          });
        }
      }

    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    setCancelLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/payhere/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.id, immediate: false }),
      });

      if (!response.ok) throw new Error('Failed to cancel subscription');

      await fetchAllData();
      setShowCancelModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Cancel error:', error);
      setShowCancelModal(false);
      setErrorMessage('Failed to cancel subscription. Please try again.');
      setShowErrorModal(true);
    } finally {
      setCancelLoading(false);
    }
  };

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (limit === null) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <ClockIcon className="w-3.5 h-3.5" />
          Changes Pending
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading subscription...</p>
        </div>
      </div>
    );
  }

  const planName = usage?.planName || 'Free';
  const isFreePlan = planName === 'Free';
  const currentPlanDetails = planDetails[planName] || planDetails.Free;
  const sessionPercentage = getUsagePercentage(usage?.sessions || 0, usage?.sessionLimit ?? null);
  const heatmapPercentage = getUsagePercentage(usage?.heatmaps || 0, usage?.heatmapLimit ?? null);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription & Usage</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your plan and track resource usage</p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-blue-500/25"
        >
          <ArrowUpRightIcon className="w-4 h-4" />
          {isFreePlan ? 'Upgrade Plan' : 'Change Plan'}
        </Link>
      </div>

      {/* Plan Card */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className={`absolute inset-0 bg-gradient-to-r ${currentPlanDetails.gradient} opacity-5`} />
        <div className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${currentPlanDetails.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                {currentPlanDetails.icon}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">{planName} Plan</h2>
                  {subscription && getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
                </div>
                <p className="text-gray-600 text-sm max-w-md">{currentPlanDetails.description}</p>
              </div>
            </div>

            {subscription && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <CreditCardIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">${subscription.subscription_plans.price_usd}/mo</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    Next: {subscription.current_period_end 
                      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {currentPlanDetails.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 rounded-lg">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs text-gray-700 truncate">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sessions Usage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <EyeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sessions</h3>
                <p className="text-xs text-gray-500">Recorded this month</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {(usage?.sessions || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                / {usage?.sessionLimit === null ? '∞' : usage?.sessionLimit?.toLocaleString()}
              </p>
            </div>
          </div>

          {usage?.sessionLimit !== null && (
            <>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getUsageColor(sessionPercentage)} transition-all duration-500 rounded-full`}
                  style={{ width: `${sessionPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {sessionPercentage.toFixed(1)}% used • Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </>
          )}

          {sessionPercentage >= 80 && usage?.sessionLimit !== null && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <FireIcon className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-amber-700">
                {sessionPercentage >= 90 ? 'Approaching limit! Upgrade to avoid interruption.' : 'Usage is high. Consider upgrading.'}
              </p>
            </div>
          )}
        </div>

        {/* Heatmaps Usage */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Heatmaps</h3>
                <p className="text-xs text-gray-500">Pages tracked</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {(usage?.heatmaps || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                / {usage?.heatmapLimit === null ? '∞ pages' : `${usage?.heatmapLimit}/day`}
              </p>
            </div>
          </div>

          {usage?.heatmapLimit !== null ? (
            <>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getUsageColor(heatmapPercentage)} transition-all duration-500 rounded-full`}
                  style={{ width: `${heatmapPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {heatmapPercentage.toFixed(1)}% of daily limit
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <SparklesIcon className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-700">Unlimited heatmaps on this plan</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cancel Section */}
        {!isFreePlan && subscription && !subscription.cancel_at_period_end && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
            <p className="text-gray-500 text-sm mb-4">
              Cancel anytime. Access continues until the billing period ends.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel Plan
            </button>
          </div>
        )}

        {/* Security Badge */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Secure Payments</h3>
              <p className="text-gray-500 text-sm">
                Payments processed via PayHere. We never store card details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Cancel Subscription?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Your access continues until {subscription && new Date(subscription.current_period_end).toLocaleDateString()}.
              You won&apos;t be charged again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Keep Plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Cancellation Confirmed</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Your subscription is cancelled. You&apos;ll keep access until the end of your billing period.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Something Went Wrong</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {errorMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
