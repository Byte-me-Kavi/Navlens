"use client";

import React, { useState } from "react";
import {
  CheckIcon,
  XMarkIcon,
  StarIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

// --- COLOR CONSTANTS ---
const colors = {
  primary: "text-blue-600",
  primaryBg: "bg-blue-600",
  primaryHover: "hover:bg-blue-700",
  dark: "text-gray-900",
  accent: "text-cyan-500",
  bg: "bg-gray-50",
  cardBg: "bg-white",
  textPrimary: "text-gray-900",
  textSecondary: "text-gray-600",
  border: "border-gray-200",
  success: "text-green-600",
  warning: "text-amber-600",
  info: "text-blue-600",
  purple: "text-purple-600",
  purpleBg: "bg-purple-600",
  black: "text-gray-900",
};

const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small websites and blogs",
      price: {
        monthly: 29,
        yearly: 290,
      },
      originalPrice: {
        monthly: 39,
        yearly: 390,
      },
      popular: false,
      features: [
        "Up to 3 websites",
        "10,000 monthly pageviews",
        "Basic heatmaps",
        "30-day data retention",
        "Email support",
        "Basic reports",
      ],
      limitations: [
        "No API access",
        "No custom integrations",
        "Limited export options",
      ],
      cta: "Start Free Trial",
      color: "blue",
    },
    {
      name: "Professional",
      description: "Ideal for growing businesses and agencies",
      price: {
        monthly: 79,
        yearly: 790,
      },
      originalPrice: {
        monthly: 99,
        yearly: 990,
      },
      popular: true,
      features: [
        "Up to 10 websites",
        "100,000 monthly pageviews",
        "Advanced heatmaps",
        "90-day data retention",
        "Priority email support",
        "Advanced reports & analytics",
        "API access",
        "Custom integrations",
        "A/B testing support",
      ],
      limitations: [],
      cta: "Start Free Trial",
      color: "purple",
    },
    {
      name: "Enterprise",
      description: "For large organizations with advanced needs",
      price: {
        monthly: 199,
        yearly: 1990,
      },
      originalPrice: {
        monthly: 249,
        yearly: 2490,
      },
      popular: false,
      features: [
        "Unlimited websites",
        "Unlimited pageviews",
        "All heatmap features",
        "1-year data retention",
        "Phone & priority support",
        "White-label reports",
        "Advanced API access",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "Custom training",
      ],
      limitations: [],
      cta: "Contact Sales",
      color: "black",
    },
  ];

  const faqs = [
    {
      question: "Can I change my plan at any time?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Yes! We offer a 14-day free trial for all plans. No credit card required to get started.",
    },
    {
      question: "What happens if I exceed my pageview limit?",
      answer:
        "We'll notify you when you approach your limit. You can upgrade your plan or we'll temporarily pause tracking until the next billing cycle.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "We offer a 30-day money-back guarantee. If you're not satisfied, contact our support team for a full refund.",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Absolutely. You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
    },
  ];

  return (
    <>
      <Navbar />

      <div className={`min-h-screen ${colors.bg}`}>
        <div className="max-w-7xl mx-auto py-16 px-6 lg:px-8">
          {/* Hero Section */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <SparklesIcon className="w-4 h-4" />
              Simple, Transparent Pricing
            </div>
            <h1 className={`text-5xl font-bold ${colors.dark} mb-6`}>
              Choose Your Plan
            </h1>
            <p
              className={`text-xl ${colors.textSecondary} max-w-3xl mx-auto leading-relaxed mb-8`}
            >
              Start free and scale as you grow. All plans include our core
              heatmap features with different limits and advanced capabilities.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 p-1 bg-white rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  billingCycle === "monthly"
                    ? `${colors.primaryBg} text-white shadow-sm`
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-3 rounded-lg font-medium transition-all relative ${
                  billingCycle === "yearly"
                    ? `${colors.primaryBg} text-white shadow-sm`
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  SAVE 25%
                </span>
              </button>
            </div>
          </header>

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl ${
                  colors.cardBg
                } border-2 ${
                  plan.popular
                    ? "border-purple-300 shadow-xl scale-105"
                    : `border-gray-200 shadow-sm`
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div
                      className={`px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-full flex items-center gap-1`}
                    >
                      <StarIcon className="w-4 h-4" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3
                    className={`text-2xl font-bold ${colors.textPrimary} mb-2`}
                  >
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${colors.textSecondary} mb-6`}>
                    {plan.description}
                  </p>

                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price[billingCycle]}
                      </span>
                      <span className={`text-lg ${colors.textSecondary}`}>
                        /{billingCycle === "monthly" ? "mo" : "yr"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        Save $
                        {plan.originalPrice[billingCycle] -
                          plan.price[billingCycle]}{" "}
                        annually
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckIcon
                        className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                      />
                      <span className={`text-sm ${colors.textSecondary}`}>
                        {feature}
                      </span>
                    </div>
                  ))}

                  {plan.limitations.map((limitation, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <XMarkIcon
                        className={`w-5 h-5 text-gray-400 shrink-0 mt-0.5`}
                      />
                      <span className={`text-sm text-gray-400`}>
                        {limitation}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href={
                    plan.name === "Enterprise" ? "/contact" : "/dashboard/login"
                  }
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 font-semibold rounded-xl transition-all duration-200 ${
                    plan.popular
                      ? `${colors.purpleBg} text-white hover:bg-purple-700 shadow-lg hover:shadow-xl`
                      : plan.name === "Enterprise"
                      ? "bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md"
                      : `${colors.primaryBg} text-white hover:${colors.primaryHover} shadow-sm hover:shadow-md`
                  }`}
                >
                  {plan.cta}
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
              </div>
            ))}
          </div>

          {/* Features Comparison */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Compare All Features
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                Detailed breakdown of what&apos;s included in each plan
              </p>
            </div>

            <div
              className={`overflow-x-auto rounded-2xl border ${colors.border} ${colors.cardBg} shadow-sm`}
            >
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${colors.border} bg-gray-50`}>
                    <th className="text-left p-6 font-semibold text-gray-900">
                      Features
                    </th>
                    <th className="text-center p-6 font-semibold text-gray-900">
                      Starter
                    </th>
                    <th className="text-center p-6 font-semibold text-purple-600">
                      Professional
                    </th>
                    <th className="text-center p-6 font-semibold text-gray-900">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Websites", "3", "10", "Unlimited"],
                    ["Monthly Pageviews", "10K", "100K", "Unlimited"],
                    ["Data Retention", "30 days", "90 days", "1 year"],
                    ["Heatmap Types", "Basic", "Advanced", "All"],
                    ["API Access", "✗", "✓", "✓"],
                    ["Custom Reports", "✗", "✓", "✓"],
                    ["Priority Support", "✗", "✓", "✓"],
                    ["White-label", "✗", "✗", "✓"],
                    ["Dedicated Manager", "✗", "✗", "✓"],
                  ].map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b ${colors.border} hover:bg-gray-50`}
                    >
                      <td className="p-6 font-medium text-gray-900">
                        {row[0]}
                      </td>
                      <td className="p-6 text-center text-gray-600">
                        {row[1]}
                      </td>
                      <td className="p-6 text-center text-purple-600 font-semibold">
                        {row[2]}
                      </td>
                      <td className="p-6 text-center text-gray-900 font-semibold">
                        {row[3]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Frequently Asked Questions
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                Everything you need to know about our pricing and plans
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-xl ${colors.cardBg} border ${colors.border} shadow-sm`}
                >
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-3`}
                  >
                    {faq.question}
                  </h3>
                  <p
                    className={`text-base ${colors.textSecondary} leading-relaxed`}
                  >
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section
            className={`p-12 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border} text-center`}
          >
            <div className="max-w-2xl mx-auto">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Ready to Get Started?
              </h2>
              <p className={`text-lg ${colors.textSecondary} mb-8`}>
                Join thousands of websites using Navlens to optimize their user
                experience. Start your free trial today - no credit card
                required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard/login"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 ${colors.primaryBg} text-white rounded-xl hover:${colors.primaryHover} transition-all duration-200 font-semibold text-lg shadow-sm hover:shadow-lg`}
                >
                  Start Free Trial <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <Link
                  href="/contact"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg`}
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default PricingPage;
