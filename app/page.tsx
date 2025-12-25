"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { HeroIllustration } from "@/components/ui/HeroIllustration";
import Footer from "@/components/Footer";
import {
  CursorArrowRaysIcon,
  ChartBarIcon,
  EyeIcon,
  SparklesIcon,
  ArrowRightIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  BoltIcon,
  UsersIcon,
  CheckCircleIcon,
  FireIcon,
  PresentationChartLineIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    icon: CursorArrowRaysIcon,
    title: "Click Heatmaps",
    description:
      "Visualize exactly where users click on your pages. Identify hotspots and dead zones to optimize your layout.",
    color: "blue",
  },
  {
    icon: ChartBarIcon,
    title: "Real-Time Analytics",
    description:
      "Monitor user behavior as it happens. Get instant insights into how visitors interact with your site.",
    color: "purple",
  },
  {
    icon: PresentationChartLineIcon,
    title: "Scroll Information",
    description:
      "Track how far users scroll on your pages. Understand content engagement and optimize page layout.",
    color: "blue",
  },
  {
    icon: EyeIcon,
    title: "Session Recording",
    description:
      "Watch exactly how users navigate your site. Replay sessions to understand user journeys.",
    color: "blue",
  },
  {
    icon: RocketLaunchIcon,
    title: "Lightning Fast",
    description:
      "Minimal impact on page load times. Our optimized tracking script is under 20KB gzipped.",
    color: "purple",
  },
  {
    icon: ShieldCheckIcon,
    title: "Privacy First",
    description:
      "GDPR and CCPA compliant. We respect user privacy while providing powerful analytics.",
    color: "blue",
  },
  {
    icon: SparklesIcon,
    title: "AI Insights",
    description:
      "Get AI-powered recommendations to improve conversions and user experience automatically.",
    color: "purple",
  },
  {
    icon: BoltIcon,
    title: "Lightning Fast Performance",
    description:
      "Minimal impact on page load times. Our optimized tracking script is under 20KB gzipped for maximum performance.",
    color: "blue",
  },
  {
    icon: DevicePhoneMobileIcon,
    title: "Multi-Device Support",
    description:
      "Separate insights for desktop, tablet, and mobile users. Optimize experiences perfectly for every device type.",
    color: "purple",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4 md:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Text Content */}
              <div className="space-y-5">
                {/* Main Heading */}
                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  <span className="text-gray-900">Navlens Analytics</span>
                  <br />
                  <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Track User Behavior
                  </span>
                </h1>

                {/* Description */}
                <p className="text-xl text-black leading-relaxed max-w-xl">
                  Visualize user behavior with stunning heatmaps. Track every
                  click, scroll, and interaction to optimize your website&apos;s
                  performance.
                </p>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <UsersIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        10K+
                      </div>
                      <div className="text-sm text-gray-600">Active Users</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <FireIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        50M+
                      </div>
                      <div className="text-sm text-gray-600">
                        Events Tracked
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="group px-8 py-4 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    suppressHydrationWarning
                  >
                    Get Started Free
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                    suppressHydrationWarning
                  >
                    View Demo
                  </button>
                </div>
              </div>

              {/* Right Side - Illustration */}
              <div className="relative">
                <div className="relative bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50">
                  <HeroIllustration />
                  {/* Floating elements */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 opacity-20 blur-2xl animate-pulse" />
                  <div
                    className="absolute -bottom-4 -left-4 w-32 h-32 rounded-2xl bg-linear-to-br from-purple-500 to-pink-600 opacity-20 blur-2xl animate-pulse"
                    style={{ animationDelay: "1s" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="container mx-auto max-w-7xl">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50/50 backdrop-blur-sm border border-purple-200 mb-4">
                <BoltIcon className="w-5 h-5 text-purple-700" />
                <span className="text-sm font-semibold text-purple-800">
                  Powerful Features
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Features for{" "}
                <span className="text-blue-600">Understand Users</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Comprehensive analytics tools designed to help you make
                data-driven decisions
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const bgColor =
                  feature.color === "blue"
                    ? "bg-blue-600 shadow-md shadow-blue-600/30"
                    : "bg-purple-600 shadow-md shadow-purple-600/30";
                const hoverBorder =
                  feature.color === "blue"
                    ? "hover:border-blue-400"
                    : "hover:border-purple-400";

                return (
                  <div
                    key={index}
                    onClick={() => router.push("/features")}
                    className={`group relative bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 ${hoverBorder} hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer`}
                  >
                    {/* Content */}
                    <div className="p-6">
                      <div
                        className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
                        Learn more
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="container mx-auto max-w-7xl">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 backdrop-blur-sm border border-blue-200 mb-4">
                <SparklesIcon className="w-5 h-5 text-blue-700" />
                <span className="text-sm font-semibold text-blue-800">
                  Simple Process
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                How It <span className="text-blue-600">Works</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get up and running in minutes with our straightforward setup
                process
              </p>
            </div>

            {/* Steps Grid */}
            <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <div className="bg-transparent backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center flex-1 w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Install Tracker
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Add our lightweight tracking script to your website in
                      seconds
                    </p>
                  </div>
                </div>
                {/* Connector Line */}
                <div
                  className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-linear-to-r from-blue-400 to-transparent"
                  style={{
                    width: "calc(100% - 2rem)",
                    left: "calc(50% + 2rem)",
                  }}
                />
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-600/30">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <div className="bg-transparent backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center flex-1 w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Start Tracking
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Immediately begin collecting user interaction data and
                      events
                    </p>
                  </div>
                </div>
                {/* Connector Line */}
                <div
                  className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-linear-to-r from-purple-400 to-transparent"
                  style={{
                    width: "calc(100% - 2rem)",
                    left: "calc(50% + 2rem)",
                  }}
                />
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <div className="bg-transparent backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center flex-1 w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Visualize Data
                    </h3>
                    <p className="text-gray-600 text-sm">
                      View beautiful heatmaps and session recordings in your
                      dashboard
                    </p>
                  </div>
                </div>
                {/* Connector Line */}
                <div
                  className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-linear-to-r from-blue-400 to-transparent"
                  style={{
                    width: "calc(100% - 2rem)",
                    left: "calc(50% + 2rem)",
                  }}
                />
              </div>

              {/* Step 4 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-600/30">
                    <span className="text-2xl font-bold text-white">4</span>
                  </div>
                  <div className="bg-transparent backdrop-blur-sm rounded-2xl p-6 border border-gray-200 text-center flex-1 w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Optimize
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Use insights to improve UX and boost conversions in the
                      Dashboard
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="container backdrop-blur-md bg-transparent mx-auto max-w-7xl">
            <div className="text-center bg-transparent mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Trusted by <span className="text-blue-600">Thousands</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-transparent backdrop-blur-sm rounded-2xl border border-gray-200 shadow-md">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  99.9%
                </div>
                <div className="text-gray-900 font-semibold mb-1">Uptime</div>
                <div className="text-gray-600 text-sm">
                  Rock-solid reliability
                </div>
              </div>

              <div className="text-center p-8 bg-transparent backdrop-blur-sm rounded-2xl border border-blue-200 shadow-md">
                <div className="text-5xl font-bold text-blue-700 mb-2">
                  24/7
                </div>
                <div className="text-gray-900 font-semibold mb-1">Support</div>
                <div className="text-gray-600 text-sm">Always here to help</div>
              </div>

              <div className="text-center p-8 bg-transparent backdrop-blur-sm rounded-2xl border border-purple-200 shadow-md">
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  1B+
                </div>
                <div className="text-gray-900 font-semibold mb-1">
                  Events Processed
                </div>
                <div className="text-gray-600 text-sm">Massive scale</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="relative overflow-hidden bg-purple-50 backdrop-blur-md rounded-3xl p-12 md:p-16 shadow-2xl border border-white/50">
              <div className="relative z-10 text-center space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                  Ready to Get Started?
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Join thousands of businesses using Navlens Analytics to understand their
                  users better and boost conversions.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-8 py-4 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    suppressHydrationWarning
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Start Free Trial
                  </button>
                  <button
                    onClick={() => router.push("/pricing")}
                    className="px-8 py-4 bg-transparent text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                    suppressHydrationWarning
                  >
                    View Pricing
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  No credit card required · 14-day free trial · Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Above Background */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
