"use client";

import React, { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BoltIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  PlayCircleIcon,
  EnvelopeIcon,
  StarIcon,
  LockClosedIcon,
  UserGroupIcon,
  TagIcon,
  ArrowTrendingUpIcon,
  Cog8ToothIcon,
} from "@heroicons/react/24/outline";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Getting Started guides
  const gettingStartedGuides = useMemo(
    () => [
      {
        title: "Installation Guide",
        description: "Set up Navlens in your project in just a few minutes",
        icon: RocketLaunchIcon,
        steps: 3,
      },
      {
        title: "First Heatmap Setup",
        description: "Create and configure your first heatmap visualization",
        icon: CursorArrowRaysIcon,
        steps: 4,
      },
      {
        title: "Dashboard Overview",
        description: "Navigate and utilize the Navlens dashboard features",
        icon: ChartBarIcon,
        steps: 5,
      },
      {
        title: "Installation Guide",
        description: "Set up Navlens in your project in just a few minutes",
        icon: RocketLaunchIcon,
        steps: 3,
      },
      {
        title: "First Heatmap Setup",
        description: "Create and configure your first heatmap visualization",
        icon: CursorArrowRaysIcon,
        steps: 4,
      },
      {
        title: "Dashboard Overview",
        description: "Navigate and utilize the Navlens dashboard features",
        icon: ChartBarIcon,
        steps: 5,
      },
      {
        title: "Tracking Configuration",
        description: "Configure tracking parameters and event collection",
        icon: Cog8ToothIcon,
        steps: 4,
      },
      {
        title: "Data Analysis Basics",
        description: "Learn fundamental data analysis and interpretation",
        icon: ArrowTrendingUpIcon,
        steps: 5,
      },
    ],
    []
  );

  // Integration guides
  const integrations = useMemo(
    () => [
      {
        name: "React",
        description: "Seamless integration with React applications",
        logo: "âš›ï¸",
        code: `import { initNavlens } from 'navlens';\n\ninitNavlens({\n  apiKey: 'your-api-key',\n  trackingId: 'site-id'\n});`,
      },
      {
        name: "Next.js",
        description: "Full Next.js framework support with SSR",
        logo: "â–²",
        code: `// app/layout.tsx\nimport { NavlensProvider } from 'navlens/next';\n\nexport default function Layout() {\n  return (\n    <NavlensProvider>\n      <YourApp />\n    </NavlensProvider>\n  );\n}`,
      },
      {
        name: "Vue",
        description: "Vue 3 composition API integration",
        logo: "ðŸ’š",
        code: `import { useNavlens } from 'navlens/vue';\n\nexport default {\n  setup() {\n    const navlens = useNavlens({\n      apiKey: 'your-api-key'\n    });\n    return { navlens };\n  }\n}`,
      },
      {
        name: "Vanilla JS",
        description: "Plain JavaScript integration",
        logo: "ðŸ“¦",
        code: `<script src="https://cdn.navlens.io/tracker.js"><\/script>\n<script>\n  window.Navlens.init({\n    apiKey: 'your-api-key'\n  });\n<\/script>`,
      },
    ],
    []
  );

  // API Reference
  const apiReference = useMemo(
    () => [
      {
        title: "Initialization API",
        description: "Initialize and configure Navlens",
        icon: SparklesIcon,
        details: [
          "init(config)",
          "setUser(userId)",
          "identify(properties)",
          "track(eventName, properties)",
        ],
      },
      {
        title: "Events API",
        description: "Track and manage user events",
        icon: BoltIcon,
        details: [
          "trackEvent(name, data)",
          "trackPageView(url)",
          "trackConversion(value)",
          "trackError(error)",
        ],
      },
      {
        title: "Heatmap API",
        description: "Control heatmap generation and display",
        icon: CursorArrowRaysIcon,
        details: [
          "generateHeatmap(selector)",
          "updateHeatmap(data)",
          "exportHeatmap(format)",
          "clearHeatmap()",
        ],
      },
      {
        title: "Analytics API",
        description: "Access analytics data and reports",
        icon: ChartBarIcon,
        details: [
          "getMetrics(timeRange)",
          "getSessionData(sessionId)",
          "getConversionFunnel()",
          "exportReport(format)",
        ],
      },
    ],
    []
  );

  // Best Practices
  const bestPractices = useMemo(
    () => [
      {
        title: "Optimize Tracking",
        description: "Minimize tracking overhead and maximize data quality",
        icon: BoltIcon,
        tips: [
          "Debounce tracking events",
          "Batch data before sending",
          "Use efficient selectors",
          "Monitor bandwidth usage",
        ],
      },
      {
        title: "Segment Users",
        description: "Categorize users for targeted analysis",
        icon: UserGroupIcon,
        tips: [
          "Use consistent user IDs",
          "Tag user properties",
          "Group by device/browser",
          "Create cohorts",
        ],
      },
      {
        title: "Set Up Goals",
        description: "Define and track conversion goals",
        icon: TagIcon,
        tips: [
          "Identify key actions",
          "Set conversion triggers",
          "Track funnel steps",
          "Monitor goal completion",
        ],
      },
      {
        title: "Analyze Patterns",
        description: "Discover insights from user behavior patterns",
        icon: SparklesIcon,
        tips: [
          "Compare timeframes",
          "Identify trends",
          "Find anomalies",
          "Segment by behavior",
        ],
      },
      {
        title: "Privacy Compliance",
        description: "Ensure GDPR and CCPA compliance",
        icon: LockClosedIcon,
        tips: [
          "Get user consent",
          "Anonymize data",
          "Respect DNT headers",
          "Offer opt-out",
        ],
      },
      {
        title: "Performance Tuning",
        description: "Optimize application and tracking performance",
        icon: Cog8ToothIcon,
        tips: [
          "Enable compression",
          "Use CDN",
          "Cache data",
          "Monitor latency",
        ],
      },
    ],
    []
  );

  // FAQ
  const faqs = useMemo(
    () => [
      {
        question: "How do I get started with Navlens?",
        answer:
          "Start by signing up for an account, then install the tracking script on your website. Configure your first heatmap, and you'll begin collecting data immediately. Check our Installation Guide for step-by-step instructions.",
      },
      {
        question: "Is Navlens GDPR compliant?",
        answer:
          "Yes, Navlens is fully GDPR and CCPA compliant. We provide tools to obtain user consent, anonymize data, and allow users to opt-out of tracking. See our Privacy Policy and compliance documentation for details.",
      },
      {
        question: "What's the performance impact of Navlens?",
        answer:
          "Our tracking script is only 20KB gzipped and has minimal performance impact. It's loaded asynchronously and uses event batching to reduce network overhead. Most sites see less than 1ms impact on page load.",
      },
      {
        question: "Can I track session recordings?",
        answer:
          "Yes, Navlens supports session recording and replay. You can watch actual user sessions to understand behavior patterns. All recordings respect privacy settings and GDPR requirements.",
      },
      {
        question: "How long is data retained?",
        answer:
          "Free plans retain data for 30 days, while Pro and Enterprise plans offer 90 days and custom retention periods. You can download and archive data at any time.",
      },
      {
        question: "What formats can I export reports in?",
        answer:
          "You can export reports as PDF, CSV, JSON, or PNG. Use our API or dashboard to schedule automated report delivery to your team.",
      },
      {
        question: "Do you offer API access?",
        answer:
          "Yes, we provide a comprehensive REST API and webhooks for advanced integrations. See our API Reference section for detailed documentation.",
      },
    ],
    []
  );

  // Video Tutorials
  const videoTutorials = [
    {
      title: "Getting Started in 5 Minutes",
      description: "Quick setup and first heatmap configuration",
      duration: "5:23",
      thumbnail: PlayCircleIcon,
    },
    {
      title: "Advanced Analytics & Segmentation",
      description: "Learn to segment and analyze user cohorts",
      duration: "12:15",
      thumbnail: ChartBarIcon,
    },
    {
      title: "Integration & Custom Events",
      description: "Track custom events and integrate with your app",
      duration: "8:47",
      thumbnail: Cog8ToothIcon,
    },
    {
      title: "Dashboard Mastery",
      description: "Master all dashboard features and customizations",
      duration: "15:32",
      thumbnail: BookOpenIcon,
    },
  ];

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();

    const allContent = [
      ...gettingStartedGuides.map((g) => ({
        ...g,
        category: "Getting Started",
      })),
      ...integrations.map((i) => ({ ...i, category: "Integrations" })),
      ...apiReference.map((a) => ({ ...a, category: "API Reference" })),
      ...bestPractices.map((p) => ({ ...p, category: "Best Practices" })),
      ...faqs.map((f) => ({ ...f, category: "FAQ" })),
    ];

    return allContent.filter(
      (item: {
        title?: string;
        name?: string;
        description?: string;
        question?: string;
      }) =>
        item.title?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.question?.toLowerCase().includes(query)
    );
  }, [
    searchQuery,
    gettingStartedGuides,
    integrations,
    apiReference,
    bestPractices,
    faqs,
  ]);

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 md:px-6 overflow-hidden">
        {/* Background Gradient Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="relative container mx-auto max-w-6xl">
          <div className="text-center space-y-6 mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 text-blue-700 rounded-full text-sm font-semibold backdrop-blur-md hover:bg-blue-100 transition-colors">
              <BookOpenIcon className="w-4 h-4" />
              Complete Documentation
            </div>

            <h1 className="text-5xl md:text-7xl font-bold">
              <span className="text-gray-900">Documentation</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get started with Navlens and master user behavior analytics. From
              installation to advanced tracking, find all the resources you
              need.
            </p>

            {/* Search Box */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {searchResults && searchResults.length > 0 && (
        <section className="px-4 md:px-6 py-12 border-t border-gray-200">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-8">
              Found {searchResults.length} result
              {searchResults.length !== 1 ? "s" : ""}
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {(
                        result as {
                          title?: string;
                          name?: string;
                          question?: string;
                        }
                      ).title ||
                        (
                          result as {
                            title?: string;
                            name?: string;
                            question?: string;
                          }
                        ).name ||
                        (
                          result as {
                            title?: string;
                            name?: string;
                            question?: string;
                          }
                        ).question}
                    </h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {(result as { category?: string }).category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {(result as { description?: string; answer?: string })
                      .description ||
                      (result as { description?: string; answer?: string })
                        .answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content - Only show if no search or search is cleared */}
      {!searchQuery && (
        <>
          {/* Getting Started Section */}
          <section className="px-4 md:px-6 py-20 border-t border-gray-200">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-3">Getting Started</h2>
                <p className="text-lg text-gray-600">
                  Quick start guides to get you up and running in minutes
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gettingStartedGuides.map((guide, idx) => {
                  const Icon = guide.icon;
                  const guideSlug = guide.title
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                  return (
                    <a
                      key={idx}
                      href={`/docs/guides/${guideSlug}`}
                      className="group bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer block"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
                          <Icon className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {guide.steps} min read
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-gray-900">
                        {guide.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {guide.description}
                      </p>
                      <div className="flex items-center text-blue-600 text-sm font-semibold group-hover:gap-2 transition-all">
                        Read Guide <ArrowRightIcon className="w-4 h-4" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Integration Guides Section */}
          {/* <section className="px-4 md:px-6 py-20 bg-white/50">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-3">Integration Guides</h2>
                <p className="text-lg text-gray-600">
                  Integrate Navlens with your favorite framework
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {integrations.map((integration, idx) => (
                  <div
                    key={idx}
                    className="group bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-4xl">{integration.logo}</div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {integration.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-gray-50/50">
                      <p className="text-xs font-semibold text-gray-500 mb-3">
                        CODE EXAMPLE
                      </p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
                        <code>{integration.code}</code>
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section> */}

          {/* API Reference Section */}
          <section className="px-4 md:px-6 py-20">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-3">API Reference</h2>
                <p className="text-lg text-gray-600">
                  Comprehensive documentation for all Navlens APIs
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {apiReference.map((api, idx) => {
                  const Icon = api.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg group-hover:from-purple-200 group-hover:to-blue-200 transition-colors">
                          <Icon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {api.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {api.description}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 mt-6 pt-4 border-t border-gray-200">
                        {api.details.map((detail, detailIdx) => (
                          <div
                            key={detailIdx}
                            className="flex items-center gap-2 text-sm text-gray-700 font-mono bg-gray-50/50 p-2 rounded"
                          >
                            <CheckCircleIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Best Practices Section */}
          <section className="px-4 md:px-6 py-20 bg-white/50">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-3">Best Practices</h2>
                <p className="text-lg text-gray-600">
                  Tips and strategies for maximum effectiveness
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bestPractices.map((practice, idx) => {
                  const Icon = practice.icon;
                  return (
                    <div
                      key={idx}
                      className="group bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl p-6 hover:border-green-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="mb-4">
                        <div className="inline-flex p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg group-hover:from-green-200 group-hover:to-emerald-200 transition-colors">
                          <Icon className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-gray-900">
                        {practice.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {practice.description}
                      </p>
                      <ul className="space-y-2">
                        {practice.tips.map((tip, tipIdx) => (
                          <li
                            key={tipIdx}
                            className="flex items-start gap-2 text-sm text-gray-700"
                          >
                            <StarIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 md:px-6 py-20">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-3">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-gray-600">
                  Find answers to common questions about Navlens
                </p>
              </div>

              <div className="space-y-4 max-w-4xl">
                {faqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group bg-white/70 backdrop-blur-md border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all duration-300"
                  >
                    <summary className="p-6 cursor-pointer flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <h3 className="text-lg font-semibold text-gray-900 text-left">
                        {faq.question}
                      </h3>
                      <QuestionMarkCircleIcon className="w-6 h-6 text-gray-400 group-open:text-blue-600 transition-colors flex-shrink-0 ml-4" />
                    </summary>
                    <div className="px-6 pb-6 pt-0 border-t border-gray-200 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Video Tutorials Section */}
          <section className="px-4 md:px-6 py-20 bg-white/50">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-12">
                <h2 className="text-4xl font-bold mb-3">Video Tutorials</h2>
                <p className="text-lg text-gray-600">
                  Learn by watching our comprehensive video guides
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {videoTutorials.map((video, idx) => (
                  <div
                    key={idx}
                    className="group bg-white/70 backdrop-blur-md border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-12 flex items-center justify-center aspect-video overflow-hidden">
                      <video.thumbnail className="w-24 h-24 text-white opacity-80 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-300" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <PlayCircleIcon className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {video.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Need Help Section */}
          <section className="px-4 md:px-6 py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
            <div className="relative container mx-auto max-w-4xl">
              <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl p-8 md:p-12 text-center">
                <div className="inline-flex p-4 bg-blue-100 rounded-full mb-6">
                  <EnvelopeIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-4xl font-bold mb-4">Need Help?</h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Can&apos;t find what you&apos;re looking for? Our support team
                  is here to help. Reach out with any questions or issues.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Contact Support
                  </button>
                  <button className="px-8 py-3 bg-white/70 border border-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-white transition-colors">
                    Email Us
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
