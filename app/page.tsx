"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";
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
} from "@heroicons/react/24/outline";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-cyan-50 text-gray-900 overflow-x-hidden relative">
      {/* Animated 3D Background - Fixed Bottom Layer */}
      <div className="fixed inset-0 z-0">
        <AnimatedBackground />
      </div>

      {/* Navbar - Top Layer */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Main Content - Middle Layer */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4 md:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Text Content */}
              <div className="space-y-8">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 backdrop-blur-sm">
                  <SparklesIcon className="w-5 h-5 text-cyan-600" />
                  <span className="text-sm font-semibold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    AI-Powered Analytics
                  </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                  <span className="bg-linear-to-r from-blue-900 via-blue-700 to-cyan-600 bg-clip-text text-transparent">
                    Navlens
                  </span>
                  <br />
                  <span className="text-gray-900">Transform Clicks</span>
                  <br />
                  <span className="bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Into Insights
                  </span>
                </h1>

                {/* Description */}
                <p className="text-xl text-gray-700 leading-relaxed max-w-xl">
                  Visualize user behavior with stunning heatmaps. Track every
                  click, scroll, and interaction to optimize your website's
                  performance.
                </p>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
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
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
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
                    className="group px-8 py-4 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    Get Started Free
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => router.push("/docs")}
                    className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-900 rounded-xl font-semibold border-2 border-gray-200 hover:border-cyan-500 hover:bg-white transition-all duration-300"
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
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 opacity-20 blur-2xl animate-pulse" />
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 backdrop-blur-sm mb-4">
                <BoltIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Powerful Features
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Everything You Need to{" "}
                <span className="bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Understand Users
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Comprehensive analytics tools designed to help you make
                data-driven decisions
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Card 1 */}
              <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/30">
                  <CursorArrowRaysIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Click Heatmaps
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Visualize exactly where users click on your pages. Identify
                  hotspots and dead zones to optimize your layout.
                </p>
              </div>

              {/* Feature Card 2 */}
              <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                  <ChartBarIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Real-Time Analytics
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Monitor user behavior as it happens. Get instant insights into
                  how visitors interact with your site.
                </p>
              </div>

              {/* Feature Card 3 */}
              <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/30">
                  <EyeIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Session Recording
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Watch exactly how users navigate your site. Replay sessions to
                  understand user journeys.
                </p>
              </div>

              {/* Feature Card 4 */}
              <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-cyan-500 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-cyan-500 to-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/30">
                  <RocketLaunchIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Lightning Fast
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Minimal impact on page load times. Our optimized tracking
                  script is under 20KB gzipped.
                </p>
              </div>

              {/* Feature Card 5 */}
              <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
                  <ShieldCheckIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Privacy First
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  GDPR and CCPA compliant. We respect user privacy while
                  providing powerful analytics.
                </p>
              </div>

              {/* Feature Card 6 */}
              <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/30">
                  <SparklesIcon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  AI Insights
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Get AI-powered recommendations to improve conversions and user
                  experience automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20 px-4 md:px-6 bg-linear-to-br from-white/50 to-blue-50/50 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Trusted by{" "}
                <span className="bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Thousands
                </span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                <div className="text-5xl font-bold bg-linear-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  99.9%
                </div>
                <div className="text-gray-900 font-semibold mb-1">Uptime</div>
                <div className="text-gray-600 text-sm">
                  Rock-solid reliability
                </div>
              </div>

              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                <div className="text-5xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  24/7
                </div>
                <div className="text-gray-900 font-semibold mb-1">Support</div>
                <div className="text-gray-600 text-sm">Always here to help</div>
              </div>

              <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                <div className="text-5xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
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
            <div className="relative overflow-hidden bg-linear-to-br from-cyan-600 via-blue-600 to-purple-600 rounded-3xl p-12 md:p-16 shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

              <div className="relative z-10 text-center space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Ready to Get Started?
                </h2>
                <p className="text-xl text-blue-50 max-w-2xl mx-auto">
                  Join thousands of businesses using Navlens to understand their
                  users better and boost conversions.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Start Free Trial
                  </button>
                  <button
                    onClick={() => router.push("/pricing")}
                    className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold border-2 border-white/30 hover:bg-white/20 transition-all duration-300"
                  >
                    View Pricing
                  </button>
                </div>
                <p className="text-sm text-blue-100">
                  No credit card required · 14-day free trial · Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer - Above Background */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
