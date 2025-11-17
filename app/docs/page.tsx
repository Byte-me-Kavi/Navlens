"use client";

import React from "react";
import {
  PuzzlePieceIcon,
  ArrowRightIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ClockIcon,
  GlobeAltIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

// --- COLOR CONSTANTS (Tailwind classes) ---
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
};

const DocumentationPage: React.FC = () => {
  return (
    <>
      <Navbar />

      <div className={`min-h-screen ${colors.bg}`}>
        <div className="max-w-6xl mx-auto py-12 px-6 lg:px-8">
          {/* Hero Section */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
              <EyeIcon className="w-4 h-4" />
              User Behavior Analytics
            </div>
            <h1 className={`text-5xl font-bold ${colors.dark} mb-6`}>
              Navlens Documentation
            </h1>
            <p
              className={`text-xl ${colors.textSecondary} max-w-3xl mx-auto leading-relaxed`}
            >
              Transform visitor interactions into actionable insights. See
              exactly where users click, how they scroll, and what content
              captures their attention across all devices.
            </p>
          </header>

          {/* How It Works Section */}
          <section
            className={`mb-12 p-8 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border}`}
          >
            <div className="text-center mb-8">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                How Navlens Works
              </h2>
              <p
                className={`text-lg ${colors.textSecondary} max-w-2xl mx-auto`}
              >
                Our intelligent tracking system captures real user interactions
                and transforms them into visual insights
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CursorArrowRaysIcon
                    className={`w-8 h-8 ${colors.primary}`}
                  />
                </div>
                <h3
                  className={`text-xl font-semibold ${colors.textPrimary} mb-2`}
                >
                  1. Track Interactions
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Lightweight JavaScript captures clicks, scrolls, and user
                  movements in real-time
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ChartBarIcon className={`w-8 h-8 ${colors.primary}`} />
                </div>
                <h3
                  className={`text-xl font-semibold ${colors.textPrimary} mb-2`}
                >
                  2. Process Data
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Advanced algorithms analyze patterns and generate heatmaps
                  with precise coordinates
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <EyeIcon className={`w-8 h-8 ${colors.primary}`} />
                </div>
                <h3
                  className={`text-xl font-semibold ${colors.textPrimary} mb-2`}
                >
                  3. Visualize Insights
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Interactive heatmaps show exactly where users engage most with
                  your content
                </p>
              </div>
            </div>
          </section>

          {/* What We Collect Section */}
          <section
            className={`mb-12 p-8 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheckIcon className={`w-8 h-8 ${colors.success}`} />
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>
                What Data We Collect
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3
                  className={`text-xl font-semibold ${colors.textPrimary} mb-4`}
                >
                  User Interactions
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Click Positions
                      </span>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        X,Y coordinates of all user clicks relative to page
                        content
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Scroll Depth
                      </span>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        How far users scroll through your content
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Element Interactions
                      </span>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        Which buttons, links, and interactive elements users
                        engage with
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div>
                <h3
                  className={`text-xl font-semibold ${colors.textPrimary} mb-4`}
                >
                  Technical Data
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Device Type
                      </span>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        Desktop, tablet, or mobile device classification
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Viewport Size
                      </span>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        Screen dimensions for accurate heatmap scaling
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircleIcon
                      className={`w-5 h-5 ${colors.success} shrink-0 mt-0.5`}
                    />
                    <div>
                      <span className="font-medium text-gray-900">
                        Page URL
                      </span>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        Which specific pages users are interacting with
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div
              className={`mt-8 p-4 bg-green-50 border border-green-200 rounded-xl`}
            >
              <div className="flex items-start gap-3">
                <ShieldCheckIcon
                  className={`w-6 h-6 ${colors.success} shrink-0 mt-0.5`}
                />
                <div>
                  <h4 className={`font-semibold text-green-900 mb-1`}>
                    Privacy First
                  </h4>
                  <p className={`text-sm text-green-800`}>
                    We never collect personally identifiable information, IP
                    addresses, or any sensitive user data. All tracking is
                    anonymous and aggregated for analysis.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section
            className={`mb-12 p-8 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border}`}
          >
            <div className="text-center mb-8">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Powerful Features
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                Everything you need to understand and optimize user experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-md transition-shadow`}
              >
                <DevicePhoneMobileIcon
                  className={`w-8 h-8 ${colors.primary} mb-4`}
                />
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                >
                  Multi-Device Analysis
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Separate heatmaps for desktop, tablet, and mobile users to
                  identify device-specific issues
                </p>
              </div>

              <div
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-md transition-shadow`}
              >
                <ChartBarIcon className={`w-8 h-8 ${colors.primary} mb-4`} />
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                >
                  Real-Time Updates
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  See new user interactions appear in your heatmaps as they
                  happen
                </p>
              </div>

              <div
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-md transition-shadow`}
              >
                <GlobeAltIcon className={`w-8 h-8 ${colors.primary} mb-4`} />
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                >
                  Multi-Site Support
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Track multiple websites from a single dashboard with
                  individual analytics
                </p>
              </div>

              <div
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-md transition-shadow`}
              >
                <EyeIcon className={`w-8 h-8 ${colors.primary} mb-4`} />
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                >
                  Interactive Overlays
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Click on heatmap points to see detailed information about user
                  interactions
                </p>
              </div>

              <div
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-md transition-shadow`}
              >
                <ClockIcon className={`w-8 h-8 ${colors.primary} mb-4`} />
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                >
                  Historical Data
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Access heatmaps from any date range to track performance over
                  time
                </p>
              </div>

              <div
                className={`p-6 rounded-xl border ${colors.border} hover:shadow-md transition-shadow`}
              >
                <CursorArrowRaysIcon
                  className={`w-8 h-8 ${colors.primary} mb-4`}
                />
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                >
                  Smart Element Detection
                </h3>
                <p className={`text-sm ${colors.textSecondary}`}>
                  Automatically identifies clickable elements and interactive
                  components
                </p>
              </div>
            </div>
          </section>

          {/* Installation Section */}
          <section
            className={`mb-12 p-8 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <PuzzlePieceIcon className={`w-8 h-8 ${colors.primary}`} />
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>
                Quick Setup Guide
              </h2>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.primaryBg} text-white font-bold text-sm`}
                >
                  1
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                  >
                    Create Your Account & Add Site
                  </h3>
                  <p className={`text-sm ${colors.textSecondary} mb-3`}>
                    Sign up for Navlens and register your website in the
                    dashboard. Each site gets a unique tracking code.
                  </p>
                  <Link
                    href="/dashboard/login"
                    className={`inline-flex items-center gap-2 px-4 py-2 ${colors.primaryBg} text-white rounded-lg hover:${colors.primaryHover} transition-colors text-sm font-medium`}
                  >
                    Get Started <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.primaryBg} text-white font-bold text-sm`}
                >
                  2
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                  >
                    Install Tracking Code
                  </h3>
                  <p className={`text-sm ${colors.textSecondary} mb-3`}>
                    Copy the generated script tag and paste it in the
                    &lt;head&gt; section of every page you want to track.
                  </p>
                  <div
                    className={`p-4 rounded-lg bg-gray-900 text-green-400 font-mono text-sm overflow-x-auto border ${colors.border}`}
                  >
                    <div>&lt;head&gt;</div>
                    <div className="pl-4">...</div>
                    <div className="pl-4 bg-gray-800 p-2 rounded">
                      &lt;script async
                      src=&quot;https://navlens-rho.vercel.app/tracker.js&quot;
                    </div>
                    <div className="pl-4 bg-gray-800 p-2 rounded">
                      data-site-id=&quot;your-site-id&quot;
                    </div>
                    <div className="pl-4 bg-gray-800 p-2 rounded">
                      data-api-key=&quot;your-api-key&quot;&gt;
                    </div>
                    <div className="pl-4 bg-gray-800 p-2 rounded">
                      &lt;/script&gt;
                    </div>
                    <div className="pl-4">...</div>
                    <div>&lt;/head&gt;</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${colors.primaryBg} text-white font-bold text-sm`}
                >
                  3
                </div>
                <div className="flex-1">
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                  >
                    Start Collecting Data
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    Once installed, Navlens begins tracking user interactions
                    immediately. Heatmaps will appear in your dashboard within
                    minutes as users visit your site.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl`}
            >
              <div className="flex items-start gap-3">
                <ClockIcon
                  className={`w-6 h-6 ${colors.info} shrink-0 mt-0.5`}
                />
                <div>
                  <h4 className={`font-semibold text-blue-900 mb-1`}>
                    Data Processing Time
                  </h4>
                  <p className={`text-sm text-blue-800`}>
                    Allow 2-5 minutes for new interactions to process and appear
                    in your heatmaps. Real-time updates ensure you see the
                    latest user behavior.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section
            className={`mb-12 p-8 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border}`}
          >
            <div className="text-center mb-8">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Perfect For
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                Optimize every aspect of your user experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div
                className={`p-6 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100`}
              >
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-3`}
                >
                  E-commerce Optimization
                </h3>
                <ul className={`text-sm ${colors.textSecondary} space-y-2`}>
                  <li>
                    • Identify which product images get the most attention
                  </li>
                  <li>• Optimize call-to-action button placement</li>
                  <li>• Improve checkout flow completion rates</li>
                  <li>• Test different pricing display strategies</li>
                </ul>
              </div>

              <div
                className={`p-6 rounded-xl bg-linear-to-br from-green-50 to-emerald-50 border border-green-100`}
              >
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-3`}
                >
                  Content Marketing
                </h3>
                <ul className={`text-sm ${colors.textSecondary} space-y-2`}>
                  <li>• See which headlines capture attention</li>
                  <li>• Optimize blog post layouts and readability</li>
                  <li>• Improve newsletter signup form placement</li>
                  <li>• Track engagement with multimedia content</li>
                </ul>
              </div>

              <div
                className={`p-6 rounded-xl bg-linear-to-br from-purple-50 to-violet-50 border border-purple-100`}
              >
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-3`}
                >
                  SaaS Platforms
                </h3>
                <ul className={`text-sm ${colors.textSecondary} space-y-2`}>
                  <li>• Optimize feature adoption and usage</li>
                  <li>• Improve onboarding flow completion</li>
                  <li>• Identify confusing UI elements</li>
                  <li>• Track user engagement with dashboards</li>
                </ul>
              </div>

              <div
                className={`p-6 rounded-xl bg-linear-to-br from-orange-50 to-amber-50 border border-orange-100`}
              >
                <h3
                  className={`text-lg font-semibold ${colors.textPrimary} mb-3`}
                >
                  Lead Generation
                </h3>
                <ul className={`text-sm ${colors.textSecondary} space-y-2`}>
                  <li>• Optimize contact form placement and design</li>
                  <li>• Improve conversion funnel visibility</li>
                  <li>• Track engagement with lead magnets</li>
                  <li>• Identify friction points in signup flows</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section
            className={`mb-12 p-8 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border} text-center`}
          >
            <div className="max-w-2xl mx-auto">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Ready to Understand Your Users?
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
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className={`pt-8 border-t ${colors.border} text-center`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className={`text-sm ${colors.textSecondary}`}>
                © 2025 Navlens. Privacy-first user analytics.
              </div>
              <div className="flex items-center gap-6">
                <Link
                  href="/privacy"
                  className={`text-sm ${colors.primary} hover:underline`}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className={`text-sm ${colors.primary} hover:underline`}
                >
                  Terms of Service
                </Link>
                <Link
                  href="/support"
                  className={`text-sm ${colors.primary} hover:underline`}
                >
                  Support
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default DocumentationPage;
