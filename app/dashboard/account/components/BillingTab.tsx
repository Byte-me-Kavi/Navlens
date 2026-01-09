"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  CheckCircleIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  CloudIcon,
  FireIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  StarIcon,
  BuildingOffice2Icon,
  PaperAirplaneIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { PLANS } from '@/lib/plans/config';
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { CancelModal } from "@/components/subscription/CancelModal";

import { jsPDF } from "jspdf";

// Helper Interface
interface PaymentRecord {
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_date: string;
    payhere_order_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any;
}

// Plan Configurations for UI
const PLAN_UI: Record<string, { icon: React.ElementType; color: string; badge: string; ring: string }> = {
  Free: { 
      icon: PaperAirplaneIcon, 
      color: 'bg-gray-50 text-gray-600', 
      badge: 'bg-gray-100 text-gray-700',
      ring: 'ring-gray-200'
  },
  Starter: { 
      icon: RocketLaunchIcon, 
      color: 'bg-emerald-50 text-emerald-600', 
      badge: 'bg-emerald-50 text-emerald-700',
      ring: 'ring-emerald-200'
  },
  Pro: { 
      icon: StarIcon, 
      color: 'bg-indigo-50 text-indigo-600', 
      badge: 'bg-indigo-50 text-indigo-700',
      ring: 'ring-indigo-200'
  },
  Enterprise: { 
      icon: BuildingOffice2Icon, 
      color: 'bg-purple-50 text-purple-600', 
      badge: 'bg-purple-50 text-purple-700',
      ring: 'ring-purple-200'
  }
};

// Invoice Generator
const generateInvoice = async (payment: PaymentRecord, planName: string, userName: string = 'Valued Customer', userEmail: string = '', subscriptionId: string = '') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // -- Brand Colors --
    const PRIMARY_COLOR = '#4F46E5'; // Indigo 600
    const TEXT_COLOR = '#1F2937';    // Gray 800
    const GRAY_COLOR = '#6B7280';    // Gray 500
    const BORDER_COLOR = '#E5E7EB';  // Gray 200

    // -- Helper: Load Logo --
    const loadLogo = (): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = '/images/logo.png';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } else {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
        });
    };

    const logoData = await loadLogo();

    // -- Header Section --
    // Logo
    if (logoData) {
        doc.addImage(logoData, 'PNG', 20, 15, 12, 12); // Adjust aspect ratio as needed
        doc.setFontSize(20);
        doc.setTextColor(TEXT_COLOR);
        doc.setFont("helvetica", "bold");
        doc.text("Navlens Analytics", 36, 23);
    } else {
        // Fallback if logo invalid
        doc.setFontSize(20);
        doc.setTextColor(PRIMARY_COLOR);
        doc.setFont("helvetica", "bold");
        doc.text("Navlens Analytics", 20, 23);
    }

    // Company Contact Info (Left, under logo/title)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY_COLOR);
    doc.text("Email: navlensanalytics@gmail.com", 20, 32);
    doc.text("Mobile: 077 467 1009", 20, 37);

    // Invoice Label & Details (Right Side)
    doc.setFontSize(24);
    doc.setTextColor(PRIMARY_COLOR); // Indigo Accent
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth - 20, 23, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${payment.payhere_order_id || 'INV-' + payment.id.slice(0, 8)}`, pageWidth - 20, 32, { align: 'right' });
    doc.text(`Date: ${new Date(payment.payment_date).toLocaleDateString()}`, pageWidth - 20, 37, { align: 'right' });
    doc.text(`Status: ${payment.status.toUpperCase()}`, pageWidth - 20, 42, { align: 'right' });

    // -- Divider --
    doc.setDrawColor(BORDER_COLOR);
    doc.line(20, 48, pageWidth - 20, 48);

    // -- Bill To Section --
    doc.setFontSize(10);
    doc.setTextColor(GRAY_COLOR);
    doc.text("Bill To:", 20, 58);
    
    doc.setFontSize(11);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text(userName, 20, 64);
    
    let billToY = 69;
    if (userEmail) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(userEmail, 20, billToY);
        billToY += 5;
    }
    
    // Add Subscription ID
    if (subscriptionId) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(GRAY_COLOR);
        doc.text(`Subscription ID: ${subscriptionId}`, 20, billToY);
    }

    // -- Item Table --
    const tableTop = 80;
    
    // Table Header Background
    doc.setFillColor(249, 250, 251); // Gray 50
    doc.rect(20, tableTop, pageWidth - 40, 10, 'F');
    
    // Table Header Text
    doc.setFontSize(9);
    doc.setTextColor(GRAY_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPTION", 25, tableTop + 7);
    doc.text("AMOUNT", pageWidth - 25, tableTop + 7, { align: 'right' });

    // Table Content
    const rowTop = tableTop + 18;
    doc.setFontSize(10);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "normal");
    doc.text(`Subscription - ${planName} Plan`, 25, rowTop);
    doc.text(`${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}`, pageWidth - 25, rowTop, { align: 'right' });

    // Divider
    doc.line(20, rowTop + 8, pageWidth - 20, rowTop + 8);

    // -- Totals Section (Right Aligned) --
    const totalY = rowTop + 18;
    
    // Subtotal
    doc.setFontSize(9);
    doc.setTextColor(GRAY_COLOR);
    doc.text("Subtotal", pageWidth - 60, totalY);
    doc.text(`${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}`, pageWidth - 25, totalY, { align: 'right' });

    // Total (Bold)
    doc.setFontSize(12);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text("Total", pageWidth - 60, totalY + 8);
    doc.text(`${payment.currency.toUpperCase()} ${payment.amount.toFixed(2)}`, pageWidth - 25, totalY + 8, { align: 'right' });

    // -- Footer --
    const footerY = pageHeight - 20;
    doc.setDrawColor(BORDER_COLOR);
    doc.line(20, footerY - 10, pageWidth - 20, footerY - 10);

    doc.setFontSize(8);
    doc.setTextColor(GRAY_COLOR);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for choosing Navlens Analytics.", 20, footerY);
    
    doc.setFont("helvetica", "normal");
    doc.text("Questions? Contact us at navlensanalytics@gmail.com or 077 467 1009", pageWidth - 20, footerY, { align: 'right' });

    doc.save(`Navlens_Invoice_${payment.payhere_order_id || payment.id}.pdf`);
};

export function BillingTab() {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [usage, setUsage] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Trigger modal
  const handleCancelClick = () => {
      setShowCancelModal(true);
  };

  // Actual cancellation logic
  const confirmCancellation = async () => {
      setIsCancelling(true);
      try {
          const res = await fetch('/api/payhere/cancel-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionId: subscription?.id })
          });
          
          if (!res.ok) throw new Error('Failed to cancel');
          
          // Refresh page
          window.location.reload();
      } catch (e) {
          console.error(e);
          alert('Failed to cancel subscription. Please contact support.');
          setIsCancelling(false);
          setShowCancelModal(false);
      }
  };
  const [userData, setUserData] = useState<{ name: string; email: string; createdAt?: string }>({ name: '', email: '' });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserData({
            name: user.user_metadata?.full_name || 'Valued Customer',
            email: user.email || '',
            createdAt: user.created_at
        });

        // 1. Fetch Subscription (Direct)
        const { data: directSub } = await supabase
            .from('subscriptions')
            .select(`
                id, status, start_date, current_period_end, cancel_at_period_end,
                subscription_plans (name, price_usd, price_lkr, features)
            `)
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeSub = directSub;
        
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent shadow-sm" />
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
  // @ts-expect-error - dynamic key access
  const sessionLimit = PLANS[normPlanName.toUpperCase()]?.limits?.sessions ?? (normPlanName === 'Free' ? 500 : null);
  const sessionPct = sessionLimit ? Math.min((sessions / sessionLimit) * 100, 100) : 0;

  const heatmaps = usage?.heatmaps || 0;
  const heatmapLimit = normPlanName === 'Free' ? 10 : null; // Hardcoded free limit
  const heatmapPct = heatmapLimit ? Math.min((heatmaps / heatmapLimit) * 100, 100) : 0;

  // Calculate Trial Status
  const daysSinceSignup = userData.createdAt 
    ? Math.floor((new Date().getTime() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isTrialExpired = isFree && daysSinceSignup > 30;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Plan Banner Card - Modern & Premium */}
      <div className={`bg-white rounded-2xl p-6 sm:p-8 border shadow-sm transition-all ${isFree ? 'border-gray-200' : 'border-indigo-100 ring-4 ring-indigo-50/50'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex items-start gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${isTrialExpired ? 'bg-red-50 text-red-600' : ui.color}`}>
                   <ui.icon className="w-8 h-8" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900">{normPlanName} Plan</h2>
                        {subscription?.cancel_at_period_end ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-100">
                                Cancels Soon
                            </span>
                        ) : isTrialExpired ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-100">
                                Trial Expired
                            </span>
                        ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${subscription?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                {subscription?.status || 'Active'}
                            </span>
                        )}
                    </div>
                    <div className="text-gray-500 text-sm leading-relaxed max-w-md space-y-1">
                        <p>
                            {isTrialExpired
                                ? "Your 30-day free trial has ended. Please upgrade to Pro to regain access to your dashboard."
                                : isFree 
                                    ? `You are on the 30-day Free Trial (${30 - daysSinceSignup} days remaining). Upgrade to Pro for unlimited access.` 
                                    : subscription?.cancel_at_period_end
                                        ? `Your subscription will end on ${new Date(subscription.current_period_end).toLocaleDateString()}. You will not be charged again.`
                                        : `You are currently on the ${normPlanName} plan. Your next billing date is ${new Date(subscription.current_period_end).toLocaleDateString()}.`}
                        </p>
                    </div>
                    {/* Subscription ID Display */}
                    {subscription?.id && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs font-medium text-indigo-600">Subscription ID:</span>
                            <code className="px-2 py-0.5 bg-indigo-100 rounded text-xs font-mono text-indigo-600 select-all">
                                {subscription.id}
                            </code>
                        </div>
                    )}
                    
                    {/* Subtle Cancel Button - Only show if active and NOT already correcting */}
                    {subscription?.status === 'active' && !isFree && !subscription?.cancel_at_period_end && (
                        <div className="mt-2">
                            <button 
                                onClick={handleCancelClick}
                                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors border-b border-transparent hover:border-red-500 pb-0.5"
                            >
                                Cancel subscription
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto min-w-[160px]">
                {/* Renew Button - Show if expiring soon (< 7 days) or already expired but somehow still active status */}
                {subscription?.status === 'active' && !isFree && !subscription.cancel_at_period_end && (
                     (() => {
                        const daysLeft = Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysLeft <= 7) {
                            return (
                                <button
                                    onClick={() => window.location.href = `/pricing?plan=${subscription.plan_id}&renew=true`}
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 shadow-indigo-100 animate-pulse"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    Renew Subscription
                                </button>
                            );
                        }
                        return null;
                     })()
                )}

                <button
                    onClick={() => setShowUpgradeModal(true)}
                    className={`
                        w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm
                        ${isFree 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 shadow-indigo-100' 
                            : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }
                    `}
                >
                    {isFree ? <><SparklesIcon className="w-4 h-4" /> Upgrade Plan</> : 'Manage Plan'}
                </button>
            </div>
        </div>

        {/* Usage Stats - Enhanced Visuals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 pt-8 border-t border-gray-100">
            {/* Sessions Bar */}
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                             <FireIcon className="w-4 h-4" />
                        </div>
                        Sessions
                    </div>
                    <div className="text-xs font-bold text-gray-900">
                        {sessions.toLocaleString()} <span className="text-gray-400 font-normal">/ {sessionLimit ? sessionLimit.toLocaleString() : '∞'}</span>
                    </div>
                </div>
                {sessionLimit && (
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${sessionPct > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${sessionPct}%` }} 
                        />
                    </div>
                )}
            </div>

            {/* Heatmaps Bar */}
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                     <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                             <ChartBarIcon className="w-4 h-4" />
                        </div>
                        Heatmaps
                    </div>
                    <div className="text-xs font-bold text-gray-900">
                        {heatmaps.toLocaleString()} <span className="text-gray-400 font-normal">/ {heatmapLimit ? heatmapLimit + '/day' : '∞'}</span>
                    </div>
                </div>
                {heatmapLimit ? (
                     <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-purple-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${heatmapPct}%` }} 
                        />
                    </div>
                ) : (
                    <div className="h-2 flex items-center">
                        <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Unlimited Access
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Payment History Table - Clean & Consistent */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <BanknotesIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Payment History</h3>
                    <p className="text-xs text-gray-500">View your recent transactions and invoices</p>
                </div>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Description</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Amount</th>
                        <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                        <th className="px-6 py-3 font-semibold text-right text-gray-600">Invoice</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {payments.length > 0 ? (
                        payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50/80 transition-colors group">
                                <td className="px-6 py-4 text-gray-600 group-hover:text-gray-900 transition-colors">
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
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                        Paid
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 capitalize">
                                        {payment.status}
                                    </span>
                                )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => generateInvoice(payment, normPlanName, userData.name, userData.email, subscription?.id || '')}
                                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs hover:underline transition-all flex items-center justify-end gap-1 ml-auto"
                                    >
                                        <ArrowUpRightIcon className="w-3 h-3" />
                                        Download
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                        <CloudIcon className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm">No payment history available</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        {/* Subtle refund link at the bottom */}
        {subscription && !isFree && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                <p className="text-xs text-gray-400 text-center">
                    Need help with billing?{' '}
                    <a
                        href={`mailto:navlensanalytics@gmail.com?subject=Refund Request - ${subscription.id}&body=Hi Navlens Team,%0D%0A%0D%0AI would like to request a refund for my subscription.%0D%0A%0D%0ASubscription ID: ${subscription.id}%0D%0AAccount Email: ${userData.email}%0D%0APlan: ${normPlanName}%0D%0A%0D%0AReason for refund (optional):%0D%0A%0D%0AThank you.`}
                        className="text-gray-500 hover:text-gray-700 underline"
                    >
                        Request a refund
                    </a>
                </p>
            </div>
        )}
      </div>
      
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        planName="Pro" 
      />

      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancellation}
        isProcessing={isCancelling}
      />
    </div>
  );
}
