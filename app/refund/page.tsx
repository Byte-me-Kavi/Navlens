"use client";

import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ReceiptRefundIcon,
  ClockIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function RefundPolicy() {
  const guaranteePoints = [
    {
      icon: ClockIcon,
      title: "30-Day Money-Back Guarantee",
      description:
        "Get a full refund within 30 days of your initial purchase if you're not satisfied with our service.",
    },
    {
      icon: CheckCircleIcon,
      title: "No Questions Asked",
      description:
        "We believe in our product. If it's not right for you, we'll process your refund without hassle.",
    },
    {
      icon: CurrencyDollarIcon,
      title: "Pro-Rated Refunds",
      description:
        "Annual subscribers can receive pro-rated refunds for unused months after the 30-day guarantee period.",
    },
  ];

  const sections = [
    {
      title: "Eligibility for Refund",
      content: `You are eligible for a refund under the following conditions:

**30-Day Money-Back Guarantee:**
• All paid subscription plans are covered
• Request must be made within 30 days of initial purchase
• Applies to first-time subscribers only
• Available once per customer

**Pro-Rated Refunds (Annual Plans):**
• Available after the 30-day guarantee period
• Calculated based on unused full months remaining
• Must be requested before the next billing cycle`,
    },
    {
      title: "Non-Refundable Items",
      content: `The following are NOT eligible for refunds:

• Renewal charges after the initial 30-day period (for monthly plans)
• Partial month usage (refunds are based on full months only)
• Accounts terminated for Terms of Service violations
• Refund requests made after 30 days (monthly plans)
• Additional usage charges or overages
• Custom enterprise agreements (separate terms apply)`,
    },
    {
      title: "How to Request a Refund",
      content: `To request a refund, please follow these steps:

**Step 1:** Log into your Navlens dashboard

**Step 2:** Navigate to Settings → Subscription

**Step 3:** Click "Request Refund" or contact our support team

**Alternative:** Email us at billing@navlens.com with:
• Your account email address
• Subscription ID (found in your billing settings)
• Reason for refund (optional, helps us improve)

Our team typically responds within 24 hours.`,
    },
    {
      title: "Refund Processing Time",
      content: `Once your refund request is approved:

**Credit/Debit Cards:**
• Refunds are processed within 5-7 business days
• May take additional 3-5 days to appear on your statement

**PayHere Wallet:**
• Refunds are processed within 2-3 business days

**Bank Transfers:**
• May take up to 10 business days depending on your bank

You will receive an email confirmation once the refund is initiated.`,
    },
    {
      title: "Subscription Cancellation vs. Refund",
      content: `It's important to understand the difference:

**Cancellation:**
• You retain access until the end of your current billing period
• No refund is issued for the remaining time
• Your data is retained for 30 days after expiration
• You can resubscribe at any time

**Refund:**
• Access is terminated immediately upon refund approval
• Full or pro-rated amount is returned to your payment method
• Your data is scheduled for deletion within 30 days

You can cancel your subscription at any time from your dashboard without requesting a refund.`,
    },
    {
      title: "Downgrades & Plan Changes",
      content: `If you wish to change your plan instead of requesting a refund:

**Upgrading:**
• Difference is charged immediately
• New features become available instantly

**Downgrading:**
• Change takes effect at the end of your billing cycle
• No refund for the difference in plan price
• Current features remain until the cycle ends

Consider downgrading if you need fewer features rather than canceling entirely.`,
    },
  ];

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 md:px-6 overflow-hidden">
        {/* Background Gradient Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="container mx-auto max-w-4xl text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 backdrop-blur-sm">
            <ReceiptRefundIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Risk-Free Guarantee
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            <span className="text-gray-900">Refund</span>
            <br />
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We offer a 30-day money-back guarantee on all plans. If Navlens
            isn't right for you, we'll refund your purchase—no questions asked.
          </p>
        </div>
      </section>

      {/* Guarantee Cards */}
      <section className="py-8 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-3 gap-6">
            {guaranteePoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <div
                  key={index}
                  className="bg-linear-to-br from-green-50 to-emerald-50 backdrop-blur-sm rounded-2xl border border-green-200 p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="w-14 h-14 mx-auto rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {point.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Policy Details */}
      <section className="py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {index + 1}
                  </span>
                  {section.title}
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-line pl-11">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Quick Links */}
          <div className="mt-12 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                <QuestionMarkCircleIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Still Have Questions?
                </h3>
                <p className="text-gray-600 mb-4">
                  Check our FAQ section on the pricing page or reach out to our
                  billing team for personalized assistance.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="/pricing#faq"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    View FAQs
                  </a>
                  <a
                    href="mailto:billing@navlens.com"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    billing@navlens.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="mt-8 bg-linear-to-br from-blue-50/50 to-purple-50/50 backdrop-blur-md rounded-2xl p-8 border border-blue-200/50 shadow-lg">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Need Help With a Refund?
              </h3>
              <p className="text-gray-600 max-w-xl mx-auto">
                Our support team is here to help. Contact us and we'll assist
                you with your refund request within 24 hours.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300"
              >
                Contact Support
                <ArrowRightIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
