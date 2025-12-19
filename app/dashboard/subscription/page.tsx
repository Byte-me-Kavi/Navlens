/**
 * Subscription Dashboard
 * Manages active subscription, shows usage, and allows cancellation
 * 
 * Security Features:
 * - Server-side subscription verification
 * - Secure subscription cancellation with confirmation
 * - No payment card details stored or displayed
 * - CSRF protection via Supabase auth tokens
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
  current: number;
  limit: number | null;
  percentage: number;
  planName: string;
}

// Plan features configuration
const planDetails: Record<string, { description: string; features: string[]; color: string; icon: string }> = {
  Free: {
    description: 'Basic analytics to get you started with user behavior tracking.',
    features: [
      '1,000 sessions per month',
      'Basic heatmaps (10/day)',
      'Session recordings (limited)',
      '14-day data retention',
      'Community support',
    ],
    color: 'gray',
    icon: '🆓',
  },
  Starter: {
    description: 'Perfect for small websites and blogs with growing traffic.',
    features: [
      '5,000 sessions per month',
      'Unlimited heatmaps',
      'Full session recordings',
      '1-month data retention',
      'Email support',
      'A/B testing (2 experiments)',
    ],
    color: 'green',
    icon: '🚀',
  },
  Pro: {
    description: 'Advanced insights for growing businesses and agencies.',
    features: [
      '25,000 sessions per month',
      'Revenue attribution',
      'AI insights (weekly)',
      'Funnel & form analytics',
      'Error tracking',
      '3-month data retention',
      'Priority support',
    ],
    color: 'blue',
    icon: '💎',
  },
  Enterprise: {
    description: 'Enterprise-grade analytics with unlimited capabilities.',
    features: [
      'Unlimited sessions',
      'Revenue heatmaps',
      'API monitoring',
      'SSO/SAML integration',
      '1-year data retention',
      'Dedicated account manager',
      'Custom integrations',
    ],
    color: 'purple',
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
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // First, try to fetch subscription via profiles (linked subscription)
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          subscription_id,
          subscriptions (
            id,
            status,
            start_date,
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
        .eq('user_id', user.id)
        .single();

      let activeSubscription = profile?.subscriptions;

      // If no subscription linked to profile, check subscriptions table directly
      if (!activeSubscription || (Array.isArray(activeSubscription) && activeSubscription.length === 0)) {
        console.log('🔍 No linked subscription, checking subscriptions table directly...');
        const { data: directSub } = await supabase
          .from('subscriptions')
          .select(`
            id,
            status,
            start_date,
            current_period_end,
            cancel_at_period_end,
            subscription_plans (
              name,
              price_usd,
              price_lkr,
              session_limit,
              features
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (directSub) {
          console.log('✅ Found active subscription directly:', directSub);
          activeSubscription = directSub as any;

          // Update profile to link this subscription
          await supabase
            .from('profiles')
            .update({ subscription_id: directSub.id })
            .eq('user_id', user.id);
        }
      }

      if (activeSubscription) {
        const sub = Array.isArray(activeSubscription) ? activeSubscription[0] : activeSubscription;
        setSubscription(sub as any);
      }

      // Fetch usage data
      const month = new Date().toISOString().slice(0, 7);
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('sessions_count')
        .eq('user_id', user.id)
        .eq('month', month)
        .single();

      // Get plan data safely
      const subscriptionData = activeSubscription as any;
      const sub = Array.isArray(subscriptionData) ? subscriptionData[0] : subscriptionData;
      const planData = sub?.subscription_plans;
      const limit = planData?.session_limit || 1000;
      const current = usageData?.sessions_count || 0;

      setUsage({
        current,
        limit,
        percentage: limit ? (current / limit) * 100 : 0,
        planName: planData?.name || 'Free',
      });

    } catch (error) {
      console.error('Failed to fetch subscription:', error);
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
        body: JSON.stringify({
          subscriptionId: subscription.id,
          immediate: false, // Cancel at period end
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Refresh data
      await fetchSubscriptionData();
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

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="w-3 h-3" />
          Cancelling at period end
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="w-3 h-3" />
          Active
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const planName = usage?.planName || 'Free';
  const isFreePlan = planName === 'Free';
  const currentPlanDetails = planDetails[planName] || planDetails.Free;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription & Usage</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage your subscription plan and monitor usage limits
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <ArrowUpRightIcon className="w-4 h-4" />
            {isFreePlan ? 'Upgrade Plan' : 'Change Plan'}
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{currentPlanDetails.icon}</div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{planName} Plan</h2>
                  {subscription && getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
                </div>
                <p className="text-gray-600 text-sm mt-1">{currentPlanDetails.description}</p>
              </div>
            </div>
          </div>

          {/* Plan Features Grid */}
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            {currentPlanDetails.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* Subscription Details */}
          {subscription && (
            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <CreditCardIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Monthly Price</p>
                  <p className="font-semibold text-gray-900">${subscription.subscription_plans.price_usd}/mo</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <CalendarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Started</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(subscription.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <ClockIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Billing</p>
                  <p className="font-semibold text-gray-900">
                    {subscription.current_period_end 
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Card - Takes 1 column */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900">Usage This Month</h3>
          </div>

          {usage && (
            <div className="space-y-4">
              {/* Usage Meter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Sessions</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {usage.current.toLocaleString()} / {usage.limit === null ? '∞' : usage.limit.toLocaleString()}
                  </span>
                </div>
                <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor(usage.percentage)} transition-all duration-500`}
                    style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {usage.percentage.toFixed(1)}% of limit used
                </p>
              </div>

              {/* Usage Warning */}
              {usage.percentage >= 80 && usage.limit !== null && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <SparklesIcon className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-800 font-medium">
                      {usage.percentage >= 90 ? 'Near Limit!' : 'Getting Close'}
                    </p>
                    <p className="text-xs text-yellow-700">
                      Consider upgrading to avoid service interruption.
                    </p>
                  </div>
                </div>
              )}

              {/* Session Limit Info */}
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Your plan includes {usage.limit === null ? 'unlimited' : usage.limit.toLocaleString()} sessions per month.
                  Usage resets on the 1st of each month.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cancel Subscription */}
        {!isFreePlan && subscription && !subscription.cancel_at_period_end && (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
            <p className="text-gray-600 text-sm mb-4">
              You can cancel your subscription at any time. You&apos;ll retain access until the end of your billing period.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        )}

        {/* Payment Security */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Secure Payments</h3>
              <p className="text-gray-600 text-sm">
                All payments are securely processed through PayHere. We never store your payment card details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <XCircleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Cancel Subscription?
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Your subscription will remain active until the end of the current billing period 
              ({subscription && new Date(subscription.current_period_end).toLocaleDateString()}). 
              You won&apos;t be charged again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Cancellation Confirmed
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Your subscription will be cancelled at the end of this billing period. 
              You&apos;ll retain access to all features until then and won&apos;t be charged again.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <XCircleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Something Went Wrong
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {errorMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
