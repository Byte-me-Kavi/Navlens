"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  XMarkIcon,
  StarIcon,
  LightBulbIcon,
  BoltIcon,
  RocketLaunchIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import { PLANS, FEATURE_LABELS } from '@/lib/plans/config';

const PricingPage: React.FC = () => {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [_currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [selectedDowngradePlan, setSelectedDowngradePlan] = useState<{id: string, name: string} | null>(null);

  const [currency, setCurrency] = useState<'USD' | 'LKR'>('USD');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [exchangeRate, setExchangeRate] = useState<number>(300); // Default fallback

  // Map Config to UI
  const getPlansFromConfig = useCallback((targetCurrency: 'USD' | 'LKR', dbPlans: any[] = []) => {
    return Object.values(PLANS).map((plan) => {
        // Find DB plan to get live prices
        const dbPlan = dbPlans.find(p => p.name === plan.name);
        
        // Format limits for display
        const limitFeatures = [
            `${plan.limits.sessions === -1 ? 'Unlimited' : plan.limits.sessions.toLocaleString()} Sessions/mo`,
            `${plan.limits.recordings === -1 ? 'Unlimited' : plan.limits.recordings.toLocaleString()} Recordings/mo`,
            `${plan.limits.retention_days} Days Data Retention`
        ];

        // Determine distinctive features
        let displayFeatures: string[] = [];
        let inheritanceText = '';

        if (plan.name === 'Free') {
            displayFeatures = plan.features;
        } else {
             // Find lower tier
             let previousPlanFeatures: string[] = [];
             let previousPlanName = '';

             if (plan.id === 'starter') {
                 previousPlanFeatures = PLANS.FREE.features;
                 previousPlanName = 'Free';
             } else if (plan.id === 'pro') {
                 previousPlanFeatures = PLANS.STARTER.features;
                 previousPlanName = 'Starter';
             } else if (plan.id === 'enterprise') {
                 previousPlanFeatures = PLANS.PRO.features;
                 previousPlanName = 'Pro';
             }

             displayFeatures = plan.features.filter(f => !previousPlanFeatures.includes(f));
             if (previousPlanName) {
                 inheritanceText = `Everything in ${previousPlanName}, plus:`;
             }
        }

        const featureLabels = displayFeatures.slice(0, 8).map(key => FEATURE_LABELS[key] || key);
        const cardFeatures = inheritanceText ? [inheritanceText, ...featureLabels] : featureLabels;

        // Calculate Price
        let monthlyPrice = plan.price;
        let yearlyPrice = Math.round(plan.price * 12 * 0.85);

        // Override with DB values if available and LKR is selected
        if (targetCurrency === 'LKR' && dbPlan?.price_lkr) {
             monthlyPrice = dbPlan.price_lkr;
             // Calculate yearly LKR with discount
             yearlyPrice = Math.round(dbPlan.price_lkr * 12 * 0.85);
             // Round to nearest 100 for cleaner yearly price
             yearlyPrice = Math.ceil(yearlyPrice / 100) * 100;
        }
        
        return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: {
                monthly: monthlyPrice,
                yearly: yearlyPrice 
            },
            originalPrice: {
                monthly: monthlyPrice,
                yearly: monthlyPrice * 12
            },
            popular: plan.name === 'Pro',
            icon: getPlanIcon(plan.name),
            status: plan.status || 'active',
            features: [
                ...limitFeatures,
                ...cardFeatures
            ], 
            cta: plan.name === 'Free' ? 'Get Started' : plan.name === 'Enterprise' ? 'Contact Sales' : 'Subscribe Now',
            isFree: plan.name === 'Free',
            allFeatures: plan.features,
            inheritanceText
        };
    }).sort((a, b) => a.price.monthly - b.price.monthly);
  }, []);

  // Fetch plans from database and user location
  useEffect(() => {
    async function init() {
      // 1. Detect Location
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.country_code === 'LK') {
            setCurrency('LKR');
            console.log('🇱🇰 Sri Lanka detected, switching to LKR');
        }
      } catch (error) {
          console.log('Location detection failed, defaulting to USD', error);
      }

      // 2. Fetch Live Prices
      let dbPlans: any[] = [];
      try {
        const { data } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price_usd', { ascending: true });
        
         if (data && data.length > 0) {
             dbPlans = data;
             // Try to deduce rate from a paid plan
             const paidPlan = data.find(p => p.price_usd > 0 && p.price_lkr > 0);
             if (paidPlan) {
                 setExchangeRate(paidPlan.price_lkr / paidPlan.price_usd);
             }
         }
      } catch (e) {
          console.warn('DB fetch warning:', e);
      }

      // 3. Update UI
      // We pass the *detected* currency here directly, as state update might not be flushed yet
      // But actually, we need to depend on the 'currency' state for toggling.
      // So we'll trigger a re-render or set plans here.
    
      // For initial load, we might want to wait for location.
      // However, to avoid blocking, we render default first (handled by initial state)
      // We need to re-call getPlansFromConfig whenever currency or dbPlans changes.
      // Since dbPlans is local here, we should store it in state if we want to toggle currency later.
    }
    
    init();
  }, [supabase]); // Run once on mount

  // Separate effect to update plans when currency changes (user toggle or auto-detect)
  // We need to fetch DB plans and store them to usage here.
  // Let's refactor the data fetching strategy slightly to store dbPlans.
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
      async function fetchData() {
          try {
            const { data } = await supabase.from('subscription_plans').select('*');
            if (data) setDbPlans(data);
          } catch (e) { console.error(e); }
          
          try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.country_code === 'LK') setCurrency('LKR');
          } catch (e) { console.error(e); }
          
          setLoading(false);
      }
      fetchData();
  }, [supabase]);

  useEffect(() => {
      setPlans(getPlansFromConfig(currency, dbPlans));
  }, [currency, dbPlans, getPlansFromConfig]);

  // Check user's current subscription
  useEffect(() => {
    async function checkCurrentSubscription() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // First try via profile link
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            subscription_id,
            subscriptions (
              id,
              status,
              plan_id
            )
          `)
          .eq('user_id', user.id)
          .single();

        let activeSubscription = profile?.subscriptions;

        // If no subscription linked to profile, check subscriptions table directly
        if (!activeSubscription || (Array.isArray(activeSubscription) && activeSubscription.length === 0)) {
          const { data: directSub } = await supabase
            .from('subscriptions')
            .select('id, status, plan_id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (directSub) {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             activeSubscription = directSub as any;
          }
        }

        if (activeSubscription) {
           const sub = Array.isArray(activeSubscription) ? activeSubscription[0] : activeSubscription;
           if (sub?.status === 'active') {
               setCurrentPlanId(sub.plan_id);
               // Find name from plan ID in static config
               const planName = Object.values(PLANS).find(p => p.id === sub.plan_id)?.name;
               setCurrentPlanName(planName || null);
           }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }

    checkCurrentSubscription();
  }, [supabase]);

  // Auto-trigger payment if returning from login with plan parameter
  useEffect(() => {
    const checkAutoPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const planParam = urlParams.get('plan');
      
      if (!planParam) return;

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔄 Auto-triggering checkout for plan:', planParam);

      // Find the plan
      const selectedPlan = plans.find(p => p.id === planParam);
      if (selectedPlan) {
        // Clear URL parameter
        window.history.replaceState({}, '', '/pricing');
        
        // Trigger checkout redirect
        handleSelectPlan(selectedPlan.id, selectedPlan.name, selectedPlan.isFree);
      }
    };

    if (plans.length > 0 && !loading) {
      checkAutoPayment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, loading]);

  // Handle plan selection with PayHere integration
  const handleSelectPlan = async (planId: string, planName: string, isFree: boolean) => {
    console.log('🔍 Plan selection started:', { planId, planName, isFree });
    
    // Free plan - just redirect to dashboard
    if (isFree) {
      console.log('✅ Free plan detected - redirecting to dashboard');
      router.push('/dashboard');
      return;
    }

    // Enterprise - redirect to contact
    if (planName === 'Enterprise') {
      console.log('✅ Enterprise plan detected - redirecting to contact');
      router.push('/contact');
      return;
    }

    console.log('💳 Paid plan detected - initiating payment');

    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No user found - redirecting to login');
      // Redirect to login with return to pricing with plan parameter
      router.push(`/login?redirect=/pricing&plan=${planId}`);
      return;
    }

    console.log('✅ User authenticated:', session.user.email);
    console.log('🚀 Calling PayHere API...');

    try {
      // Call API to initiate PayHere payment
      const response = await fetch('/api/payhere/initiate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId,
          currency: 'USD',
        }),
      });

      // Handle conflict (existing subscription) responses
      if (response.status === 409) {
        const errorData = await response.json();
        alert(errorData.message || 'You already have an active subscription.');
        // Redirect to subscription management page
        router.push('/dashboard/account?tab=billing');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate payment');
      }

      const { formHtml } = await response.json();
      console.log('✅ Payment form received, submitting to PayHere...');

      // Render and submit PayHere form directly
      const container = document.createElement('div');
      container.innerHTML = formHtml;
      document.body.appendChild(container);
      
      const form = container.querySelector('form') as HTMLFormElement;
      if (form) {
        console.log('🚀 Redirecting to PayHere...');
        form.submit();
      } else {
        throw new Error('Payment form not found');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.');
    }
  };

  // Handle downgrade scheduling
  const handleScheduleDowngrade = async (planId: string, planName: string) => {
    setSelectedDowngradePlan({ id: planId, name: planName });
    setShowDowngradeModal(true);
  };

  const confirmDowngrade = async () => {
    if (!selectedDowngradePlan) return;
    
    setDowngradeLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/payhere/schedule-downgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetPlanId: selectedDowngradePlan.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule downgrade');
      }

      alert(data.message);
      setShowDowngradeModal(false);
      // Redirect to subscription page to see the change
      router.push('/dashboard/account?tab=billing');
    } catch (error) {
      console.error('Downgrade error:', error);
      alert(error instanceof Error ? error.message : 'Failed to schedule downgrade');
    } finally {
      setDowngradeLoading(false);
    }
  };

  // Helper functions
  function getPlanIcon(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icons: any = {
      Free: RocketLaunchIcon,
      Starter: RocketLaunchIcon,
      Pro: SparklesIcon,
      Enterprise: CodeBracketIcon,
    };
    return icons[name] || RocketLaunchIcon;
  }

  function _getPlanDescription(_name: string) {
      // Use config first if available
      return '';
  }

  function _getPlanFeatures(_name: string, _sessionLimit: number | null) {
      return [];
  }

  const faqs = [
    {
      question: "Can I change my plan at any time?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits to your account.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Absolutely! We offer a 14-day free trial for all plans. No credit card required to get started. Full access to all features during your trial.",
    },
    {
      question: "What happens if I exceed my pageview limit?",
      answer:
        "We'll notify you when you approach your limit. You can upgrade your plan anytime. We don't cut off service - you'll continue tracking but may see a notice.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day money-back guarantee on annual plans. If you're not satisfied, contact our support team for a full refund, no questions asked.",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes, absolutely. You can cancel your subscription at any time from your account settings. You'll have access until the end of your current billing period.",
    },
  ];

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-6 overflow-hidden">
        {/* Background Gradient Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="container mx-auto max-w-5xl text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-50 to-purple-50 border border-purple-200 backdrop-blur-sm">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </div>

          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold leading-tight">
              <span className="text-gray-900">Simple,</span>
              <br />
              <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Transparent
              </span>
            </h1>
            <p className="text-3xl md:text-4xl font-bold text-gray-400">
              No Hidden Fees
            </p>
          </div>

          {/* Description */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Start free and scale as you grow. Choose the perfect plan for your
            needs with transparent pricing and flexible options.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                billingCycle === "monthly"
                  ? "bg-linear-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`relative px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                billingCycle === "yearly"
                  ? "bg-linear-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Yearly
              <span className="absolute -top-3 -right-3 bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                SAVE 15%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-2 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <div
                  key={index}
                  className={`group relative flex flex-col rounded-3xl transition-all duration-500 min-h-[500px] ${
                    plan.popular
                      ? "bg-white/90 backdrop-blur-xl border-2 border-purple-400 shadow-2xl shadow-purple-500/30"
                      : "bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg hover:shadow-2xl hover:-translate-y-1"
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-full shadow-lg shadow-purple-500/30">
                        <StarIcon className="w-4 h-4" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className={`p-6 flex flex-col flex-1 ${plan.status === 'inactive' ? 'opacity-70 grayscale' : ''}`}>
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        plan.popular
                          ? "bg-linear-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30"
                          : "bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                      }`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Plan Name and Description */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {plan.description}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="mb-6">
                      {typeof plan.price === "string" ? (
                        <div>
                          <div className="text-sm text-gray-600 mb-1">
                            Flexible pricing based on your needs
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {plan.price}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-4xl font-bold text-gray-900">
                              {currency === 'USD' ? '$' : 'Rs '}{plan.price[billingCycle].toLocaleString()}
                            </span>
                            <span className="text-gray-600 text-sm">
                              /{billingCycle === "monthly" ? "month" : "year"}
                            </span>
                          </div>
                          {billingCycle === "yearly" && plan.originalPrice && (
                            <div className="text-xs text-blue-600 font-semibold">
                              Save {currency === 'USD' ? '$' : 'Rs '}
                              {(plan.originalPrice[billingCycle] -
                                plan.price[billingCycle]).toLocaleString()}{" "}
                              annually
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-700">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    {(() => {
                      if (plan.status === 'inactive') {
                        return (
                          <button
                            disabled
                            className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                          >
                            Coming Soon
                          </button>
                        );
                      }

                      // Define plan tier hierarchy for upgrade/downgrade logic
                      const planTier: Record<string, number> = {
                        'Free': 0,
                        'Starter': 1,
                        'Pro': 2,
                        'Enterprise': 3,
                      };
                      const currentTier = currentPlanName ? planTier[currentPlanName] ?? 0 : -1;
                      const targetTier = planTier[plan.name] ?? 0;
                      const isUpgrade = currentPlanName && targetTier > currentTier;
                      const isDowngrade = currentPlanName && targetTier < currentTier;
                      const isSamePlan = currentPlanName === plan.name;

                      if (isSamePlan) {
                        return (
                          <div className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white cursor-default">
                            <CheckIcon className="w-5 h-5" />
                            Already Activated
                          </div>
                        );
                      } else if (isDowngrade) {
                        return (
                          <button
                            onClick={() => handleScheduleDowngrade(plan.id, plan.name)}
                            className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/50 hover:scale-105"
                          >
                            Downgrade to {plan.name}
                            <ArrowRightIcon className="w-5 h-5" />
                          </button>
                        );
                      } else if (isUpgrade) {
                        return (
                          <button
                            onClick={() => handleSelectPlan(plan.id, plan.name, plan.isFree)}
                            className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50 hover:scale-105"
                          >
                            {plan.name === 'Enterprise' ? 'Contact Us' : `Upgrade to ${plan.name}`}
                            <ArrowRightIcon className="w-5 h-5" />
                          </button>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => handleSelectPlan(plan.id, plan.name, plan.isFree)}
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                              plan.popular
                                ? "bg-linear-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105"
                                : "bg-linear-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
                            }`}
                          >
                            {plan.cta}
                            <ArrowRightIcon className="w-5 h-5" />
                          </button>
                        );
                      }
                    })()}
                  </div>

                  {/* Coming Soon Overlay */}
                  {plan.status === 'inactive' && (
                    <div className="absolute top-0 right-0 p-4 z-20">
                         <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">
                            Coming Soon
                         </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* Features Comparison Section */}
      <section className="py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 backdrop-blur-sm border border-blue-200 mb-4">
              <BoltIcon className="w-5 h-5 text-blue-700" />
              <span className="text-sm font-semibold text-blue-800">
                Feature Comparison
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Compare All Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Detailed breakdown of everything included in each plan
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-md shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left p-4 font-bold text-gray-900">
                    Features
                  </th>
                  <th className="text-center p-4 font-bold text-gray-900">
                    Starter
                  </th>
                  <th className="text-center p-4 font-bold bg-linear-to-b from-purple-50 text-purple-900">
                    Professional
                  </th>
                  <th className="text-center p-4 font-bold text-gray-900">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                  {Object.entries(PLANS.FREE.limits).map(([key, _limit]) => {
                      if (key === 'active_experiments' || key === 'active_surveys') return null;
                      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                      return (
                        <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 text-gray-700 font-medium">{label}</td>
                            <td className="p-4 text-center text-gray-600">{PLANS.STARTER.limits[key as keyof typeof PLANS.STARTER.limits] === -1 ? 'Unlimited' : PLANS.STARTER.limits[key as keyof typeof PLANS.STARTER.limits]}</td>
                            <td className="p-4 text-center text-gray-600 font-medium bg-purple-50/30">{PLANS.PRO.limits[key as keyof typeof PLANS.PRO.limits] === -1 ? 'Unlimited' : PLANS.PRO.limits[key as keyof typeof PLANS.PRO.limits]}</td>
                            <td className="p-4 text-center text-gray-600">{PLANS.ENTERPRISE.limits[key as keyof typeof PLANS.ENTERPRISE.limits] === -1 ? 'Unlimited' : PLANS.ENTERPRISE.limits[key as keyof typeof PLANS.ENTERPRISE.limits]}</td>
                        </tr>
                      );
                  })}
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-700 font-medium">{label}</td>
                      <td className="p-4 text-center">
                        {PLANS.STARTER.features.includes(key) ? (
                            <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                            <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center bg-purple-50/30">
                        {PLANS.PRO.features.includes(key) ? (
                            <CheckIcon className="w-5 h-5 text-purple-600 mx-auto" />
                        ) : (
                            <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {PLANS.ENTERPRISE.features.includes(key) ? (
                            <CheckIcon className="w-5 h-5 text-blue-600 mx-auto" />
                        ) : (
                            <XMarkIcon className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50/50 backdrop-blur-sm border border-purple-200 mb-4">
              <LightBulbIcon className="w-5 h-5 text-purple-700" />
              <span className="text-sm font-semibold text-purple-800">
                FAQs
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our pricing
            </p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-md overflow-hidden transition-all duration-300 ${
                  expandedFaq === index ? "ring-2 ring-purple-500" : ""
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                  className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 text-left">
                    {faq.question}
                  </h3>
                  <div
                    className={`w-6 h-6 rounded-full bg-linear-to-r from-blue-600 to-purple-600 flex items-center justify-center shrink-0 ml-4 transition-transform duration-300 ${
                      expandedFaq === index ? "rotate-180" : ""
                    }`}
                  >
                    <span className="text-white font-bold">+</span>
                  </div>
                </button>
                {expandedFaq === index && (
                  <div className="px-8 pb-6 border-t border-gray-200 bg-gray-50/30">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-linear-to-r from-blue-600 to-purple-600 opacity-10" />
            <div className="absolute inset-0 backdrop-blur-xl bg-white/80" />

            {/* Content */}
            <div className="relative p-12 md:p-16 text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Ready to Optimize Your User Experience?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join thousands of websites using Navlens to understand their
                users. Start your 14-day free trial today—no credit card
                required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group px-8 py-4 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/docs")}
                  className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all duration-300"
                >
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && selectedDowngradePlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <ArrowRightIcon className="w-6 h-6 text-amber-600 rotate-90" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Schedule Downgrade?</h3>
            </div>
            <p className="text-gray-600 mb-4">
              You&apos;re about to schedule a downgrade from <strong>{currentPlanName}</strong> to <strong>{selectedDowngradePlan.name}</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>Important:</strong> Your current plan features will remain active until the end of your billing cycle. The downgrade will take effect on your next billing date.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDowngradeModal(false)}
                disabled={downgradeLoading}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDowngrade}
                disabled={downgradeLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {downgradeLoading ? 'Processing...' : 'Confirm Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PricingPage;
