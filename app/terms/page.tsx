"use client";

import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function TermsOfService() {
  const sections = [
    {
      icon: DocumentTextIcon,
      title: "1. Acceptance of Terms",
      content: `By accessing or using Navlens ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.

These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 18 years of age, or the age of majority in your jurisdiction.`,
    },
    {
      icon: UserGroupIcon,
      title: "2. Description of Service",
      content: `Navlens provides web analytics services including heatmaps, session recordings, form analytics, A/B testing, and user behavior insights. We offer various subscription tiers with different feature sets and usage limits.

The Service is provided "as is" and "as available" without warranties of any kind. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.`,
    },
    {
      icon: ShieldCheckIcon,
      title: "3. User Accounts & Responsibilities",
      content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must:

• Provide accurate and complete registration information
• Notify us immediately of any unauthorized use of your account
• Ensure your use complies with applicable laws and regulations
• Obtain necessary consents before tracking users on your websites
• Not use the Service for any unlawful or prohibited purposes`,
    },
    {
      icon: ScaleIcon,
      title: "4. Intellectual Property",
      content: `The Service and its original content, features, and functionality are owned by Navlens and are protected by international copyright, trademark, and other intellectual property laws.

You retain ownership of any data you submit through the Service. By using the Service, you grant us a limited license to process your data solely for providing the Service.

Our tracking scripts, dashboards, and analytics tools remain our proprietary technology and may not be copied, modified, or reverse-engineered.`,
    },
    {
      icon: ExclamationTriangleIcon,
      title: "5. Limitation of Liability",
      content: `To the maximum extent permitted by law, Navlens shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:

• Loss of profits, data, or business opportunities
• Service interruptions or data accuracy issues
• Third-party actions or content on tracked websites
• Events beyond our reasonable control

Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.`,
    },
    {
      icon: DocumentTextIcon,
      title: "6. Termination",
      content: `We may terminate or suspend your account immediately, without prior notice, for any breach of these Terms. Upon termination:

• Your right to use the Service will cease immediately
• We may delete your data after a reasonable retention period
• Provisions that by their nature should survive will remain in effect

You may cancel your subscription at any time from your account settings. Access continues until the end of your billing period.`,
    },
    {
      icon: ScaleIcon,
      title: "7. Governing Law & Disputes",
      content: `These Terms shall be governed by the laws of the jurisdiction in which Navlens operates, without regard to conflict of law principles.

Any disputes arising from these Terms or the Service shall be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to binding arbitration in accordance with applicable arbitration rules.`,
    },
    {
      icon: DocumentTextIcon,
      title: "8. Changes to Terms",
      content: `We reserve the right to modify these Terms at any time. We will provide notice of material changes by email or through the Service.

Your continued use of the Service after changes constitute acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using the Service.`,
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
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Legal Document
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            <span className="text-gray-900">Terms of</span>
            <br />
            <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Service
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
              Welcome to Navlens. These Terms of Service govern your use of our
              web analytics platform and services. Please read these terms
              carefully before using our Service. By creating an account or
              using Navlens, you acknowledge that you have read, understood, and
              agree to be bound by these Terms.
            </p>
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
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {section.title}
                      </h2>
                      <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-linear-to-br from-blue-50/50 to-purple-50/50 backdrop-blur-md rounded-2xl p-8 border border-blue-200/50 shadow-lg">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Questions About These Terms?
              </h3>
              <p className="text-gray-600 max-w-xl mx-auto">
                If you have any questions about these Terms of Service, please
                contact our legal team.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300"
              >
                Contact Us
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
