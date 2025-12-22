"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import {
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  CloudIcon,
  SparklesIcon,
  FireIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { PLANS, FEATURE_LABELS } from '@/lib/plans/config';
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

// Helper Interface
interface PaymentRecord {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_date: string;
    payhere_order_id: string;
    metadata: any;
}

// Plan Configurations for UI
const PLAN_UI: Record<string, { icon: string; gradient: string }> = {
  Free: { icon: '🆓', gradient: 'from-gray-500 to-gray-600' },
  Starter: { icon: '🚀', gradient: 'from-emerald-500 to-teal-600' },
  Pro: { icon: '💎', gradient: 'from-blue-500 to-indigo-600' },
  Enterprise: { icon: '🏢', gradient: 'from-purple-500 to-pink-600' }
};

export function BillingTab() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Subscription
        // Attempt to get via profile first
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            subscription_id,
            subscriptions (
              id, status, start_date, current_period_end, cancel_at_period_end,
              subscription_plans (name, price_usd, price_lkr, features)
            )
          `)
          .eq('user_id', user.id)
          .single();

        let activeSub: any = profile?.subscriptions;
        
        // Handle array or single object returns
        if (Array.isArray(activeSub)) {
             activeSub = activeSub[0];
        }

        // FALLBACK: If profile join failed or returned empty/null, check subscriptions table directly
        if (!activeSub || Object.keys(activeSub).length === 0) {
            const { data: directSub } = await supabase
                .from('subscriptions')
                .select(`
                    id, status, start_date, current_period_end, cancel_at_period_end,
                    subscription_plans (name, price_usd, price_lkr, features)
                `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (directSub) {
                activeSub = directSub;
                // Optional: Update profile to link this sub (self-healing)
                // await supabase.from('profiles').update({ subscription_id: directSub.id }).eq('user_id', user.id);
            }
        }
        
        setSubscription(activeSub);

        // 2. Fetch Payment History
        if (activeSub?.id) {
            const { data: history } = await supabase
                .from('payment_history')
                .select('*')
                .eq('subscription_id', activeSub.id)
                .order('payment_date', { ascending: false });
            if (history) setPayments(history);
        }

        // 3. Fetch Real Usage
        // Remove cache to ensure fresh data for debugging "0 usage" issue
        // const USAGE_CACHE_KEY = 'navlens_subscription_usage';
        // const cached = sessionStorage.getItem(USAGE_CACHE_KEY);
        
        // Always fetch fresh
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            try {
                const usageRes = await fetch('/api/subscription-usage', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                    cache: 'no-store' // Ensure no browser caching
                });
                 if (usageRes.ok) {
                    const usageData = await usageRes.json();
                    console.log("BillingTab: Fetched usage data", usageData);
                    setUsage(usageData);
                 }
            } catch (e) { console.error("Usage fetch failed", e); }
        }

      } catch (err) {
        console.error("Error fetching billing data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent shadow-lg shadow-indigo-500/20" />
      </div>
    );
  }

  // Derive Plan Details
  const planData = subscription?.subscription_plans;
  const planName = planData?.name || "Free";
  const normPlanName = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase();
  const isFree = normPlanName === "Free";
  const ui = PLAN_UI[normPlanName] || PLAN_UI.Free;

  // Usage Calcs
  const sessions = usage?.sessions || 0;
  // @ts-ignore
  const sessionLimit = PLANS[normPlanName.toUpperCase()]?.limits?.sessions ?? (normPlanName === 'Free' ? 500 : null);
  const sessionPct = sessionLimit ? Math.min((sessions / sessionLimit) * 100, 100) : 0;

  const heatmaps = usage?.heatmaps || 0;
  const heatmapLimit = normPlanName === 'Free' ? 10 : null; // Hardcoded free limit
  const heatmapPct = heatmapLimit ? Math.min((heatmaps / heatmapLimit) * 100, 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      
      {/* 1. Plan Banner Card - Purple Glass Theme */}
      <div className="relative overflow-hidden rounded-2xl border border-white/60 shadow-xl shadow-indigo-500/10">
        <div className={`absolute inset-0 bg-gradient-to-r ${ui.gradient} opacity-10`} />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        
        <div className="relative p-6 sm:p-8 z-10">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex items-start gap-5">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${ui.gradient} flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/30 text-white`}>
                        {ui.icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">{normPlanName} Plan</h2>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {subscription?.status || 'Active'}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-2 max-w-md text-sm leading-relaxed">
                            {isFree 
                                ? "You are on the basic plan. Upgrade to unlock powerful analytics and remove limits." 
                                : `You are enjoying premium features of the ${normPlanName} plan.`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className={`
                            inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg hover:scale-105 active:scale-95
                            ${isFree 
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-indigo-500/30' 
                                : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                            }
                        `}
                    >
                        {isFree ? <><SparklesIcon className="w-4 h-4" /> Upgrade to Pro</> : 'Change Plan'}
                    </button>
                    {subscription && (
                         <div className="text-xs text-center text-gray-500 font-medium">
                            Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                         </div>
                    )}
                </div>
            </div>

            {/* Usage Stats Mini-Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-indigo-100/50">
                {/* Sessions Bar */}
                <div className="bg-white/60 rounded-xl p-4 border border-white/50 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <FireIcon className="w-4 h-4 text-orange-500" />
                            Sessions
                        </div>
                        <div className="text-xs font-bold text-gray-900">
                           {sessions.toLocaleString()} <span className="text-gray-400 font-normal">/ {sessionLimit ? sessionLimit.toLocaleString() : '∞'}</span>
                        </div>
                    </div>
                    {sessionLimit && (
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${sessionPct > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                style={{ width: `${sessionPct}%` }} 
                            />
                        </div>
                    )}
                </div>

                {/* Heatmaps Bar */}
                <div className="bg-white/60 rounded-xl p-4 border border-white/50 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                         <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <ChartBarIcon className="w-4 h-4 text-purple-500" />
                            Heatmaps
                        </div>
                        <div className="text-xs font-bold text-gray-900">
                           {heatmaps.toLocaleString()} <span className="text-gray-400 font-normal">/ {heatmapLimit ? heatmapLimit + '/day' : '∞'}</span>
                        </div>
                    </div>
                    {heatmapLimit ? (
                         <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${heatmapPct}%` }} 
                            />
                        </div>
                    ) : (
                        <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircleIcon className="w-3 h-3" /> Unlimited
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Payment History Table - Modern */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl shadow-indigo-500/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100/50 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
            <div className="flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-gray-900">Payment History</h3>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/30 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Description</th>
                        <th className="px-6 py-3 font-semibold">Amount</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Invoice</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50/50">
                    {payments.length > 0 ? (
                        payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 text-gray-600 group-hover:text-indigo-900 transition-colors">
                                    {new Date(payment.payment_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-gray-900 font-medium">
                                    {normPlanName} Subscription
                                    <div className="text-xs text-gray-400 font-normal mt-0.5">Order: {payment.payhere_order_id}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-600 font-medium">
                                    {payment.currency} {payment.amount.toFixed(2)}
                                </td>
                                <td className="px-6 py-4">
                                {payment.status === 'success' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 capitalize">
                                        {payment.status}
                                    </span>
                                )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-indigo-400 hover:text-indigo-600 font-medium text-xs disabled:opacity-50 cursor-not-allowed" disabled>
                                        Download PDF
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                        <CloudIcon className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p>No payment history found</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
      
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        planName="Pro" 
      />
    </div>
  );
}
