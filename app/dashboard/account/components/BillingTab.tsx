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
  RocketLaunchIcon,
  StarIcon,
  BuildingOffice2Icon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";
import { PLANS, FEATURE_LABELS } from '@/lib/plans/config';
import { UpgradeModal } from "@/components/subscription/UpgradeModal";

import { jsPDF } from "jspdf";

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
const generateInvoice = async (payment: PaymentRecord, planName: string, userName: string = 'Valued Customer', userEmail: string = '') => {
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
    
    if (userEmail) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(userEmail, 20, 69);
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
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userData, setUserData] = useState<{ name: string; email: string }>({ name: '', email: '' });

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
            email: user.email || ''
        });

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
  // @ts-ignore
  const sessionLimit = PLANS[normPlanName.toUpperCase()]?.limits?.sessions ?? (normPlanName === 'Free' ? 500 : null);
  const sessionPct = sessionLimit ? Math.min((sessions / sessionLimit) * 100, 100) : 0;

  const heatmaps = usage?.heatmaps || 0;
  const heatmapLimit = normPlanName === 'Free' ? 10 : null; // Hardcoded free limit
  const heatmapPct = heatmapLimit ? Math.min((heatmaps / heatmapLimit) * 100, 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Plan Banner Card - Modern & Premium */}
      <div className={`bg-white rounded-2xl p-6 sm:p-8 border shadow-sm transition-all ${isFree ? 'border-gray-200' : 'border-indigo-100 ring-4 ring-indigo-50/50'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex items-start gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${ui.color}`}>
                   <ui.icon className="w-8 h-8" />
                </div>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900">{normPlanName} Plan</h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${subscription?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {subscription?.status || 'Active'}
                        </span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-md">
                        {isFree 
                            ? "Unlock the full potential of your analytics. Upgrade to Pro for unlimited access and advanced features." 
                            : `You are currently on the ${normPlanName} plan. Your next billing date is approaching.`}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto min-w-[160px]">
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
                {subscription && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 font-medium">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    </div>
                )}
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
                                        onClick={() => generateInvoice(payment, normPlanName, userData.name, userData.email)}
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
      </div>
      
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        planName="Pro" 
      />
    </div>
  );
}
