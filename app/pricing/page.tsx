"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const PricingPage: React.FC = () => {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

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
      icon: RocketLaunchIcon,
      features: [
        "Up to 3 websites",
        "10,000 monthly pageviews",
        "Basic heatmaps",
        "30-day data retention",
        "Email support",
        "Basic reports",
      ],
      cta: "Start Free Trial",
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
      icon: SparklesIcon,
      features: [
        "Up to 10 websites",
        "100,000 monthly pageviews",
        "Advanced heatmaps & session recording",
        "90-day data retention",
        "Priority email & chat support",
        "Advanced reports & analytics",
        "API access",
        "Custom integrations",
        "A/B testing support",
      ],
      cta: "Start Free Trial",
    },
    {
      name: "Enterprise",
      description: "For large organizations with advanced needs",
      price: "Custom",
      popular: false,
      icon: CodeBracketIcon,
      features: [
        "Unlimited websites",
        "Unlimited pageviews",
        "All heatmap features",
        "1-year data retention",
        "Phone & priority support",
        "White-label reports & dashboard",
        "Advanced API access",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee & uptime monitoring",
        "Custom training & onboarding",
      ],
      cta: "Contact Sales",
    },
  ];

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
                SAVE 25%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-2 px-4 md:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div className="p-6 flex flex-col flex-1">
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
                              ${plan.price[billingCycle]}
                            </span>
                            <span className="text-gray-600 text-sm">
                              /{billingCycle === "monthly" ? "month" : "year"}
                            </span>
                          </div>
                          {billingCycle === "yearly" && plan.originalPrice && (
                            <div className="text-xs text-blue-600 font-semibold">
                              Save $
                              {plan.originalPrice[billingCycle] -
                                plan.price[billingCycle]}{" "}
                              annually
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckIcon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-700">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => router.push("/dashboard")}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
                        plan.popular
                          ? "bg-linear-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105"
                          : "bg-linear-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
                {[
                  ["Websites", "3", "10", "Unlimited"],
                  ["Monthly Pageviews", "10K", "100K", "Unlimited"],
                  ["Data Retention", "30 days", "90 days", "1 year"],
                  ["Heatmap Types", "Basic", "Advanced", "All"],
                  ["Session Recording", "✗", "✓", "✓"],
                  ["API Access", "✗", "✓", "✓"],
                  ["Custom Integrations", "✗", "✓", "✓"],
                  ["A/B Testing", "✗", "✓", "✓"],
                  ["Priority Support", "✗", "✓", "✓"],
                  ["White-label", "✗", "✗", "✓"],
                  ["Dedicated Manager", "✗", "✗", "✓"],
                  ["SLA Guarantee", "✗", "✗", "✓"],
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="p-4 font-medium text-gray-900">{row[0]}</td>
                    <td className="p-4 text-center text-gray-600">
                      {row[1] === "✓" ? (
                        <CheckIcon className="w-4 h-4 text-blue-600 mx-auto" />
                      ) : row[1] === "✗" ? (
                        <XMarkIcon className="w-4 h-4 text-gray-300 mx-auto" />
                      ) : (
                        row[1]
                      )}
                    </td>
                    <td className="p-4 text-center text-purple-900 font-semibold bg-purple-50/30">
                      {row[2] === "✓" ? (
                        <CheckIcon className="w-4 h-4 text-purple-600 mx-auto" />
                      ) : row[2] === "✗" ? (
                        <XMarkIcon className="w-4 h-4 text-gray-300 mx-auto" />
                      ) : (
                        row[2]
                      )}
                    </td>
                    <td className="p-4 text-center text-gray-900 font-semibold">
                      {row[3] === "✓" ? (
                        <CheckIcon className="w-4 h-4 text-blue-600 mx-auto" />
                      ) : row[3] === "✗" ? (
                        <XMarkIcon className="w-4 h-4 text-gray-300 mx-auto" />
                      ) : (
                        row[3]
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

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PricingPage;
