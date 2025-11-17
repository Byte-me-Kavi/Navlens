"use client";

import React from "react";
import {
  ChartBarIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ClockIcon,
  GlobeAltIcon,
  CpuChipIcon,
  ArrowRightIcon,
  CheckCircleIcon,
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

const FeaturesPage: React.FC = () => {
  const coreFeatures = [
    {
      icon: <ChartBarIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Advanced Heatmaps",
      description:
        "Visualize user interactions with precision. See exactly where users click, hover, and scroll across your entire website.",
      highlights: [
        "Real-time data",
        "Interactive overlays",
        "Custom date ranges",
      ],
    },
    {
      icon: <DevicePhoneMobileIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Multi-Device Analytics",
      description:
        "Separate insights for desktop, tablet, and mobile users. Optimize experiences for every device type.",
      highlights: [
        "Device-specific heatmaps",
        "Responsive design testing",
        "Mobile-first insights",
      ],
    },
    {
      icon: <ShieldCheckIcon className={`w-8 h-8 ${colors.success}`} />,
      title: "Privacy-First Tracking",
      description:
        "GDPR compliant analytics that respects user privacy. No personal data collection, fully anonymous tracking.",
      highlights: [
        "No PII collection",
        "GDPR compliant",
        "Anonymous data only",
      ],
    },
    {
      icon: <EyeIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Smart Element Detection",
      description:
        "Automatically identifies and tracks all interactive elements - buttons, links, forms, and custom components.",
      highlights: [
        "Auto element mapping",
        "CSS selector generation",
        "Interactive element tracking",
      ],
    },
    {
      icon: <CursorArrowRaysIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Click Tracking & Analysis",
      description:
        "Capture every click with pixel-perfect accuracy. Understand user intent and interaction patterns.",
      highlights: [
        "Pixel-perfect tracking",
        "Click heatmaps",
        "User journey mapping",
      ],
    },
    {
      icon: <ClockIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Real-Time Updates",
      description:
        "See user interactions appear in your dashboard instantly. No waiting for data processing.",
      highlights: [
        "Live data streaming",
        "Instant insights",
        "Real-time alerts",
      ],
    },
  ];

  const advancedFeatures = [
    {
      icon: <GlobeAltIcon className={`w-6 h-6 ${colors.purple}`} />,
      title: "Multi-Site Management",
      description: "Track unlimited websites from a single dashboard",
    },
    {
      icon: <CpuChipIcon className={`w-6 h-6 ${colors.primary}`} />,
      title: "API Access",
      description: "Integrate heatmap data into your own applications",
    },
    {
      icon: <ChartBarIcon className={`w-6 h-6 ${colors.success}`} />,
      title: "Custom Reports",
      description: "Generate detailed analytics reports for stakeholders",
    },
    {
      icon: <ShieldCheckIcon className={`w-6 h-6 ${colors.primary}`} />,
      title: "Data Export",
      description: "Export raw data for advanced analysis",
    },
    {
      icon: <EyeIcon className={`w-6 h-6 ${colors.purple}`} />,
      title: "A/B Testing Integration",
      description: "Compare heatmaps across different test variants",
    },
    {
      icon: <ClockIcon className={`w-6 h-6 ${colors.success}`} />,
      title: "Historical Analysis",
      description: "Track performance changes over time",
    },
  ];

  return (
    <>
      <Navbar />

      <div className={`min-h-screen ${colors.bg}`}>
        <div className="max-w-7xl mx-auto py-16 px-6 lg:px-8">
          {/* Hero Section */}
          <header className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <EyeIcon className="w-4 h-4" />
              Powerful Features
            </div>
            <h1 className={`text-5xl font-bold ${colors.dark} mb-6`}>
              Everything You Need to Understand Users
            </h1>
            <p
              className={`text-xl ${colors.textSecondary} max-w-3xl mx-auto leading-relaxed`}
            >
              Comprehensive analytics tools designed to give you deep insights
              into user behavior, helping you optimize conversions and improve
              user experience.
            </p>
          </header>

          {/* Core Features Grid */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Core Features
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                Powerful tools that transform how you understand user behavior
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {coreFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-2xl ${colors.cardBg} border ${colors.border} hover:shadow-xl transition-all duration-300 group`}
                >
                  <div className="mb-6 p-3 bg-blue-50 rounded-xl w-fit group-hover:bg-blue-100 transition-colors">
                    {feature.icon}
                  </div>
                  <h3
                    className={`text-xl font-bold ${colors.textPrimary} mb-3`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`text-base ${colors.textSecondary} mb-6 leading-relaxed`}
                  >
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <CheckCircleIcon
                          className={`w-4 h-4 ${colors.success} shrink-0`}
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Advanced Features */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Advanced Capabilities
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                Enterprise-grade features for serious analytics needs
              </p>
            </div>

            <div
              className={`p-8 rounded-2xl ${colors.cardBg} border ${colors.border} shadow-sm`}
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {advancedFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h4
                        className={`font-semibold ${colors.textPrimary} mb-1`}
                      >
                        {feature.title}
                      </h4>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Perfect For Every Industry
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                See how different industries leverage Navlens for optimization
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div
                className={`p-8 rounded-2xl bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100`}
              >
                <h3 className={`text-2xl font-bold ${colors.textPrimary} mb-4`}>
                  E-commerce
                </h3>
                <ul className={`space-y-3 ${colors.textSecondary}`}>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Optimize product page layouts and CTAs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Improve checkout funnel conversion rates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Identify high-performing product categories</span>
                  </li>
                </ul>
              </div>

              <div
                className={`p-8 rounded-2xl bg-linear-to-br from-green-50 to-emerald-50 border border-green-100`}
              >
                <h3 className={`text-2xl font-bold ${colors.textPrimary} mb-4`}>
                  SaaS Companies
                </h3>
                <ul className={`space-y-3 ${colors.textSecondary}`}>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Track feature adoption and usage patterns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Optimize onboarding flow completion</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Identify dashboard usability issues</span>
                  </li>
                </ul>
              </div>

              <div
                className={`p-8 rounded-2xl bg-linear-to-br from-purple-50 to-violet-50 border border-purple-100`}
              >
                <h3 className={`text-2xl font-bold ${colors.textPrimary} mb-4`}>
                  Content Publishers
                </h3>
                <ul className={`space-y-3 ${colors.textSecondary}`}>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Optimize article layouts and readability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Improve newsletter signup form placement</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Track engagement with multimedia content</span>
                  </li>
                </ul>
              </div>

              <div
                className={`p-8 rounded-2xl bg-linear-to-br from-orange-50 to-amber-50 border border-orange-100`}
              >
                <h3 className={`text-2xl font-bold ${colors.textPrimary} mb-4`}>
                  Lead Generation
                </h3>
                <ul className={`space-y-3 ${colors.textSecondary}`}>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Optimize contact form placement and design</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Improve conversion funnel visibility</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <span>Track engagement with lead magnets</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section
            className={`p-12 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border} text-center`}
          >
            <div className="max-w-2xl mx-auto">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Ready to Transform Your Analytics?
              </h2>
              <p className={`text-lg ${colors.textSecondary} mb-8`}>
                Join thousands of websites using Navlens to optimize their user
                experience and boost conversions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard/login"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 ${colors.primaryBg} text-white rounded-xl hover:${colors.primaryHover} transition-all duration-200 font-semibold text-lg shadow-sm hover:shadow-lg`}
                >
                  Start Free Trial <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <Link
                  href="/pricing"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg`}
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default FeaturesPage;
