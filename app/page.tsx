"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { SpotlightInteractive } from "@/components/ui/spotlight-interactive";
import {
  CursorArrowRaysIcon,
  ChartBarIcon,
  EyeIcon,
  SparklesIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  BoltIcon,
  UsersIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import Footer from "@/components/Footer";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative mt-5 min-h-screen flex items-center justify-center pt-20 pb-16 px-1 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Card */}
          <Card className="group/card relative overflow-hidden bg-white border-2 border-gray-200 hover:border-navlens-accent transition-all duration-300 shadow-xl hover:shadow-2xl min-h-[700px]">
            {/* Spotlight Effect - Only inside card */}
            <SpotlightInteractive
              className="from-blue-500/20 via-purple-500/10 to-pink-500/5"
              size={300}
            />

            {/* Decorative gradient overlays */}
            <div className="absolute inset-0 bg-linear-to-br from-navlens-accent/5 via-transparent to-navlens-electric-blue/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,200,200,0.1),transparent_50%)] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

            {/* Inset glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none shadow-[inset_0_0_60px_rgba(0,200,200,0.3)]" />

            {/* Content Container */}
            <div className="relative z-10 grid lg:grid-cols-2 gap-8 p-8 lg:p-12">
              {/* Left Side - Text Content */}
              <div className="flex flex-col justify-center space-y-8 text-left">
                {/* Main Heading */}
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-blue-900 to-navlens-accent leading-tight">
                    Understand User Behavior Like Never Before
                  </h1>
                  <p className="text-xl text-gray-700 max-w-xl leading-relaxed">
                    Visualize clicks, scrolls, and user journeys with AI-powered
                    heatmaps. Transform data into actionable insights that drive
                    conversions.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push("/login")}
                    className="group px-8 py-4 bg-blue-200 border-2 border-gray-300 rounded-lg text-blue-900 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                  >
                    Get Started Free
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="px-8 py-4 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:border-navlens-accent hover:text-navlens-accent transition-all duration-200 flex items-center gap-2">
                    <PlayIcon className="w-5 h-5" />
                    Watch Demo
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 pt-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-navlens-accent">
                      500K+
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Active Users
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-navlens-electric-blue">
                      10K+
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Websites</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-navlens-purple">
                      99.9%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Uptime</div>
                  </div>
                </div>
              </div>

              {/* Right Side - 3D Spline Scene */}
              <div className="relative lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[55%] w-full flex items-center justify-center pointer-events-none">
                <div className="w-full h-full min-h-[400px] lg:min-h-[500px] pointer-events-auto will-change-transform">
                  <SplineScene
                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-linear-to-b from-white to-gray-50">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features for{" "}
              <span className="text-blue-900">Modern Teams</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to understand and optimize user behavior on
              your website
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: CursorArrowRaysIcon,
                title: "Click Heatmaps",
                description:
                  "See exactly where users click and interact with your content",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: EyeIcon,
                title: "Scroll Tracking",
                description:
                  "Understand how far users scroll and where they lose interest",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: ChartBarIcon,
                title: "Analytics Dashboard",
                description:
                  "Real-time insights with beautiful, easy-to-understand charts",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: SparklesIcon,
                title: "AI Insights",
                description:
                  "Get AI-powered recommendations to improve conversions",
                color: "from-orange-500 to-red-500",
              },
              {
                icon: DevicePhoneMobileIcon,
                title: "Mobile Ready",
                description:
                  "Track user behavior across all devices seamlessly",
                color: "from-indigo-500 to-blue-500",
              },
              {
                icon: BoltIcon,
                title: "Lightning Fast",
                description:
                  "Sub-second load times with optimized tracking scripts",
                color: "from-yellow-500 to-orange-500",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group p-8 hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-transparent bg-white relative overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-linear-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                <div className="relative z-10">
                  <div
                    className={`w-14 h-14 rounded-xl bg-linear-to-br ${feature.color} p-3 mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of companies optimizing their websites
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: UsersIcon, value: "500K+", label: "Active Users" },
              { icon: GlobeAltIcon, value: "150+", label: "Countries" },
              { icon: RocketLaunchIcon, value: "10K+", label: "Websites" },
              { icon: ShieldCheckIcon, value: "99.9%", label: "Uptime SLA" },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center p-8 rounded-2xl bg-linear-to-br from-gray-50 to-white border-2 border-gray-200 hover:border-navlens-accent transition-all duration-300 hover:shadow-xl"
              >
                <stat.icon className="w-12 h-12 mx-auto mb-4 text-navlens-accent" />
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-linear-to-br from-blue-50 via-blue-50 to-blue-50 text-black relative overflow-hidden">
        {/* Background decoration */}
        {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,200,200,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(100,100,255,0.1),transparent_50%)]" /> */}

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Understand Your Users?
          </h2>
          <p className="text-xl text-gray-900 mb-10 max-w-2xl mx-auto">
            Start your free trial today. No credit card required. Get insights
            in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="group px-10 py-5 border-2 border-black bg-linear-to-r from-navlens-accent to-navlens-electric-blue rounded-lg text-black font-bold shadow-2xl hover:shadow-navlens-accent/50 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-10 py-5 border-2 border-black rounded-lg text-black font-semibold hover:bg-white/10 transition-all duration-200">
              Schedule Demo
            </button>
          </div>

          {/* Feature list */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-green-600">
            {[
              "14-day free trial",
              "No credit card required",
              "Cancel anytime",
              "24/7 support",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-navlens-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
