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
      content: (
        <>
          <p className="mb-3">We collect information to provide and improve our analytics services. This includes:</p>
          <p className="font-semibold mt-4 mb-2">Account Information:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email address and name when you register</li>
            <li>Billing information for paid subscriptions</li>
            <li>Communication preferences</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Analytics Data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Website visitor interactions (clicks, scrolls, mouse movements)</li>
            <li>Session recordings and heatmap data</li>
            <li>Form interaction data (anonymized)</li>
            <li>Page view and navigation patterns</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Technical Data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Browser type and version</li>
            <li>Device type and screen resolution</li>
            <li>IP addresses (anonymized after processing)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </>
      ),
    },
    {
      icon: ServerStackIcon,
      title: "2. How We Use Your Information",
      content: (
        <>
          <p className="mb-3">We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li><span className="font-semibold">Providing Services:</span> Generating heatmaps, session recordings, and analytics reports</li>
            <li><span className="font-semibold">Account Management:</span> Processing subscriptions and communicating about your account</li>
            <li><span className="font-semibold">Service Improvement:</span> Analyzing usage patterns to enhance our platform</li>
            <li><span className="font-semibold">Security:</span> Detecting and preventing fraud, abuse, and security incidents</li>
            <li><span className="font-semibold">Legal Compliance:</span> Meeting regulatory requirements and responding to legal requests</li>
          </ul>
          <p className="font-semibold text-green-700">We do NOT sell your personal information to third parties.</p>
        </>
      ),
    },
    {
      icon: FingerPrintIcon,
      title: "3. Data We Collect via Tracking Script",
      content: (
        <>
          <p className="mb-3">When our tracking script is installed on your websites, we collect:</p>
          <p className="font-semibold mt-4 mb-2">Automatically Collected:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Click coordinates and element information</li>
            <li>Scroll depth and patterns</li>
            <li>Mouse movement paths</li>
            <li>Form field interactions (without actual input values)</li>
            <li>Session duration and page navigation</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Privacy by Design:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All password and payment fields are automatically masked</li>
            <li>Sensitive input patterns (emails, phones) are detected and anonymized</li>
            <li>You can add custom masking using CSS classes</li>
            <li>IP addresses are hashed and not stored in plain text</li>
          </ul>
        </>
      ),
    },
    {
      icon: UserGroupIcon,
      title: "4. Data Sharing & Third Parties",
      content: (
        <>
          <p className="mb-3">We share data only in these limited circumstances:</p>
          <p className="font-semibold mt-4 mb-2">Service Providers:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cloud hosting (Vercel, Supabase) for infrastructure</li>
            <li>ClickHouse for analytics data storage</li>
            <li>Payment processors (PayHere) for billing</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Legal Requirements:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>When required by law, subpoena, or court order</li>
            <li>To protect our rights, privacy, safety, or property</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Business Transfers:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>In connection with a merger, acquisition, or sale of assets</li>
          </ul>
          <p className="mt-4 text-gray-600 italic">All service providers are bound by confidentiality agreements and data processing terms.</p>
        </>
      ),
    },
    {
      icon: GlobeAltIcon,
      title: "5. Your Rights (GDPR & CCPA)",
      content: (
        <>
          <p className="mb-3">Depending on your location, you may have the following rights:</p>
          <p className="font-semibold mt-4 mb-2">Access & Portability:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Request a copy of your personal data</li>
            <li>Export your analytics data in common formats</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Correction & Deletion:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Restriction & Objection:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Restrict processing of your data</li>
            <li>Object to processing for marketing purposes</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Withdraw Consent:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Withdraw consent at any time where processing is based on consent</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:navlensanalytics@gmail.com" className="text-purple-600 hover:underline">navlensanalytics@gmail.com</a></p>
        </>
      ),
    },
    {
      icon: ClockIcon,
      title: "6. Data Retention",
      content: (
        <>
          <p className="mb-3">We retain data based on your subscription plan and legal requirements:</p>
          <p className="font-semibold mt-4 mb-2">Analytics Data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Free Plan: 14 days</li>
            <li>Starter Plan: 30 days</li>
            <li>Pro Plan: 90 days</li>
            <li>Enterprise Plan: 1 year</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Account Data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Retained while your account is active</li>
            <li>Deleted within 30 days of account closure</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Backup Data:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>May be retained in encrypted backups for up to 90 days after deletion</li>
          </ul>
          <p>You can request earlier deletion by contacting support.</p>
        </>
      ),
    },
    {
      icon: ShieldCheckIcon,
      title: "7. Cookies & Tracking Technologies",
      content: (
        <>
          <p className="mb-3">We use cookies and similar technologies for:</p>
          <p className="font-semibold mt-4 mb-2">Essential Cookies:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Authentication and session management</li>
            <li>Security and fraud prevention</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Analytics Cookies:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Understanding how visitors use our dashboard</li>
            <li>Improving our services based on usage patterns</li>
          </ul>
          <p className="font-semibold mt-4 mb-2">Preferences:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Remembering your settings and preferences</li>
          </ul>
          <p>You can control cookies through your browser settings. Our tracking script uses localStorage for session management on your tracked websites.</p>
        </>
      ),
    },
    {
      icon: ServerStackIcon,
      title: "8. Security Measures",
      content: (
        <>
          <p className="mb-3">We implement industry-standard security measures:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li><span className="font-semibold">Encryption:</span> All data transmitted using TLS 1.3</li>
            <li><span className="font-semibold">Access Controls:</span> Role-based access and two-factor authentication</li>
            <li><span className="font-semibold">Infrastructure:</span> Secure cloud hosting with regular security audits</li>
            <li><span className="font-semibold">Data Isolation:</span> Customer data is logically separated</li>
            <li><span className="font-semibold">Monitoring:</span> 24/7 security monitoring and incident response</li>
          </ul>
          <p className="text-gray-600 italic">Despite our efforts, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.</p>
        </>
      ),
    },
    {
      icon: GlobeAltIcon,
      title: "9. International Data Transfers",
      content: (
        <>
          <p className="mb-3">Your data may be transferred to and processed in countries outside your residence. We ensure appropriate safeguards:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
            <li>Data Processing Agreements with all service providers</li>
            <li>Compliance with applicable data protection laws</li>
          </ul>
          <p>By using our Service, you consent to these transfers.</p>
        </>
      ),
    },
    {
      icon: ClockIcon,
      title: "10. Changes to This Policy",
      content: (
        <>
          <p className="mb-3">We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Posting the updated policy on this page</li>
            <li>Updating the &quot;Last Updated&quot; date</li>
            <li>Sending an email notification for significant changes</li>
          </ul>
          <p>Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
        </>
      ),
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
                  href="mailto:navlensanalytics@gmail.com"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300"
                >
                  navlensanalytics@gmail.com
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
