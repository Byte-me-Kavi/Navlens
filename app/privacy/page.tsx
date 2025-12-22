"use client";

import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ShieldCheckIcon,
  EyeIcon,
  ServerStackIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ClockIcon,
  FingerPrintIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function PrivacyPolicy() {
  const sections = [
    {
      icon: EyeIcon,
      title: "1. Information We Collect",
      content: `We collect information to provide and improve our analytics services. This includes:

**Account Information:**
• Email address and name when you register
• Billing information for paid subscriptions
• Communication preferences

**Analytics Data:**
• Website visitor interactions (clicks, scrolls, mouse movements)
• Session recordings and heatmap data
• Form interaction data (anonymized)
• Page view and navigation patterns

**Technical Data:**
• Browser type and version
• Device type and screen resolution
• IP addresses (anonymized after processing)
• Cookies and similar tracking technologies`,
    },
    {
      icon: ServerStackIcon,
      title: "2. How We Use Your Information",
      content: `We use the collected information for the following purposes:

• **Providing Services:** Generating heatmaps, session recordings, and analytics reports
• **Account Management:** Processing subscriptions and communicating about your account
• **Service Improvement:** Analyzing usage patterns to enhance our platform
• **Security:** Detecting and preventing fraud, abuse, and security incidents
• **Legal Compliance:** Meeting regulatory requirements and responding to legal requests

We do NOT sell your personal information to third parties.`,
    },
    {
      icon: FingerPrintIcon,
      title: "3. Data We Collect via Tracking Script",
      content: `When our tracking script is installed on your websites, we collect:

**Automatically Collected:**
• Click coordinates and element information
• Scroll depth and patterns
• Mouse movement paths
• Form field interactions (without actual input values)
• Session duration and page navigation

**Privacy by Design:**
• All password and payment fields are automatically masked
• Sensitive input patterns (emails, phones) are detected and anonymized
• You can add custom masking using CSS classes
• IP addresses are hashed and not stored in plain text`,
    },
    {
      icon: UserGroupIcon,
      title: "4. Data Sharing & Third Parties",
      content: `We share data only in these limited circumstances:

**Service Providers:**
• Cloud hosting (Vercel, Supabase) for infrastructure
• ClickHouse for analytics data storage
• Payment processors (PayHere) for billing

**Legal Requirements:**
• When required by law, subpoena, or court order
• To protect our rights, privacy, safety, or property

**Business Transfers:**
• In connection with a merger, acquisition, or sale of assets

All service providers are bound by confidentiality agreements and data processing terms.`,
    },
    {
      icon: GlobeAltIcon,
      title: "5. Your Rights (GDPR & CCPA)",
      content: `Depending on your location, you may have the following rights:

**Access & Portability:**
• Request a copy of your personal data
• Export your analytics data in common formats

**Correction & Deletion:**
• Correct inaccurate information
• Request deletion of your data ("right to be forgotten")

**Restriction & Objection:**
• Restrict processing of your data
• Object to processing for marketing purposes

**Withdraw Consent:**
• Withdraw consent at any time where processing is based on consent

To exercise these rights, contact us at privacy@navlens.com`,
    },
    {
      icon: ClockIcon,
      title: "6. Data Retention",
      content: `We retain data based on your subscription plan and legal requirements:

**Analytics Data:**
• Free Plan: 14 days
• Starter Plan: 30 days
• Pro Plan: 90 days
• Enterprise Plan: 1 year

**Account Data:**
• Retained while your account is active
• Deleted within 30 days of account closure

**Backup Data:**
• May be retained in encrypted backups for up to 90 days after deletion

You can request earlier deletion by contacting support.`,
    },
    {
      icon: ShieldCheckIcon,
      title: "7. Cookies & Tracking Technologies",
      content: `We use cookies and similar technologies for:

**Essential Cookies:**
• Authentication and session management
• Security and fraud prevention

**Analytics Cookies:**
• Understanding how visitors use our dashboard
• Improving our services based on usage patterns

**Preferences:**
• Remembering your settings and preferences

You can control cookies through your browser settings. Our tracking script uses localStorage for session management on your tracked websites.`,
    },
    {
      icon: ServerStackIcon,
      title: "8. Security Measures",
      content: `We implement industry-standard security measures:

• **Encryption:** All data transmitted using TLS 1.3
• **Access Controls:** Role-based access and two-factor authentication
• **Infrastructure:** Secure cloud hosting with regular security audits
• **Data Isolation:** Customer data is logically separated
• **Monitoring:** 24/7 security monitoring and incident response

Despite our efforts, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.`,
    },
    {
      icon: GlobeAltIcon,
      title: "9. International Data Transfers",
      content: `Your data may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards:

• Standard Contractual Clauses (SCCs) for EU data transfers
• Data Processing Agreements with all service providers
• Compliance with applicable data protection laws

By using our Service, you consent to these transfers.`,
    },
    {
      icon: ClockIcon,
      title: "10. Changes to This Policy",
      content: `We may update this Privacy Policy from time to time. We will notify you of material changes by:

• Posting the updated policy on this page
• Updating the "Last Updated" date
• Sending an email notification for significant changes

Your continued use of the Service after changes constitutes acceptance of the updated policy.`,
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-50 to-purple-50 border border-purple-200 backdrop-blur-sm">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Your Privacy Matters
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            <span className="text-gray-900">Privacy</span>
            <br />
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Policy
            </span>
          </h1>

          {/* Last Updated */}
          <p className="text-lg text-gray-600">
            Last updated: December 21, 2025
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Introduction */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 mb-8 shadow-lg">
            <p className="text-gray-700 leading-relaxed">
              At Navlens, we are committed to protecting your privacy and
              ensuring transparency about how we collect, use, and safeguard
              your information. This Privacy Policy explains our data practices
              for both our users (you) and the visitors to websites using our
              analytics services.
            </p>
          </div>

          {/* GDPR/CCPA Compliance Badge */}
          <div className="bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                GDPR & CCPA Compliant
              </h3>
              <p className="text-gray-600 text-sm">
                We respect user privacy and comply with major data protection
                regulations worldwide.
              </p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div
                  key={index}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {section.title}
                      </h2>
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-linear-to-br from-purple-50/50 to-blue-50/50 backdrop-blur-md rounded-2xl p-8 border border-purple-200/50 shadow-lg">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Privacy Concerns?
              </h3>
              <p className="text-gray-600 max-w-xl mx-auto">
                If you have questions about our privacy practices or want to
                exercise your data rights, please reach out to our privacy team.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="mailto:privacy@navlens.com"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
                >
                  privacy@navlens.com
                  <ArrowRightIcon className="w-5 h-5" />
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all duration-300"
                >
                  Contact Form
                </a>
              </div>
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
