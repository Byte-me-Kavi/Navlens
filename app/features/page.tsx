"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import {
  CursorArrowRaysIcon,
  ChartBarIcon,
  EyeIcon,
  SparklesIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckCircleIcon,
  FireIcon,
  CodeBracketIcon,
  DevicePhoneMobileIcon,
  PresentationChartLineIcon,
  TrophyIcon,
  ShoppingCartIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

export default function FeaturesPage() {
  const router = useRouter();

  const mainFeatures = [
    {
      icon: CursorArrowRaysIcon,
      title: "Click Heatmaps",
      description:
        "Visualize exactly where users click on your pages. Identify hotspots and dead zones to optimize your layout and CTA placement.",
      color: "blue",
      image: "/images/features/heatmap.png",
    },
    {
      icon: ChartBarIcon,
      title: "Real-Time Analytics",
      description:
        "Monitor user behavior as it happens. Get instant insights into how visitors interact with your site in real-time.",
      color: "purple",
      image: "/images/features/realtime.png",
    },
    {
      icon: PresentationChartLineIcon,
      title: "Scroll Information",
      description:
        "Track how far users scroll on your pages. Understand content engagement and optimize page length and layout for better results.",
      color: "blue",
      image: "/images/features/scroll.png",
    },
    {
      icon: EyeIcon,
      title: "Session Recording",
      description:
        "Watch exactly how users navigate your site. Replay sessions to understand user journeys and pain points.",
      color: "blue",
      image: "/images/features/session.png",
    },
    {
      icon: ShieldCheckIcon,
      title: "Privacy & Security",
      description:
        "GDPR and CCPA compliant. We respect user privacy while providing powerful analytics without collecting personal data.",
      color: "purple",
      image: "/images/features/security.png",
    },
    {
      icon: BoltIcon,
      title: "Lightning Fast Performance",
      description:
        "Minimal impact on page load times. Our optimized tracking script is under 20KB gzipped for maximum performance.",
      color: "blue",
      image: "/images/features/fast.png",
    },
    {
      icon: SparklesIcon,
      title: "AI-Powered Insights",
      description:
        "Get AI-powered recommendations to improve conversions and user experience automatically based on behavioral patterns.",
      color: "purple",
      image: "/images/features/ai.png",
    },
    {
      icon: DevicePhoneMobileIcon,
      title: "Multi-Device Support",
      description:
        "Separate insights for desktop, tablet, and mobile users. Optimize experiences perfectly for every device type.",
      color: "blue",
      image: "/images/features/all-devices.png",
    },
  ];

  const integrations = [
    {
      title: "Heatmaps",
      description: "Visual representation of user interactions",
      icon: FireIcon,
    },
    {
      title: "Session Replay",
      description: "Watch real user sessions unfold",
      icon: EyeIcon,
    },
    {
      title: "Behavior Analytics",
      description: "Understand user patterns and trends",
      icon: ChartBarIcon,
    },
    {
      title: "Conversion Tracking",
      description: "Monitor conversion funnels in real-time",
      icon: CheckCircleIcon,
    },
  ];

  const comparison = [
    {
      feature: "Heatmap Visualization",
      us: true,
    },
    {
      feature: "Session Recording",
      us: true,
    },
    {
      feature: "AI-Powered Insights",
      us: true,
    },
    {
      feature: "Real-Time Analytics",
      us: true,
    },
    {
      feature: "Privacy-First Design",
      us: true,
    },
  ];

  const useCases = [
    {
      title: "E-commerce Optimization",
      description:
        "Increase conversion rates by understanding where users drop off in your checkout flow. Optimize product page layouts and CTA placements.",
      icon: ShoppingCartIcon,
      gradient: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
    },
    {
      title: "SaaS Feature Adoption",
      description:
        "Track which features drive engagement and adoption. Identify UI/UX issues that confuse users and iterate faster.",
      icon: Cog8ToothIcon,
      gradient: "from-purple-50 to-pink-50",
      border: "border-purple-200",
    },
    {
      title: "Content Publisher Insights",
      description:
        "Optimize article layouts for readability and engagement. Improve newsletter signup placement and track content performance.",
      icon: DocumentTextIcon,
      gradient: "from-emerald-50 to-cyan-50",
      border: "border-emerald-200",
    },
    {
      title: "Lead Generation Funnels",
      description:
        "Optimize contact form placement and design. Understand where prospects lose interest and improve form completion rates.",
      icon: ArrowTrendingUpIcon,
      gradient: "from-orange-50 to-amber-50",
      border: "border-orange-200",
    },
  ];

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", item: "/" },
          { name: "Features", item: "/features" },
        ]}
      />
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4 md:px-6">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/80 backdrop-blur-sm border border-blue-200">
              <BoltIcon className="w-5 h-5 text-blue-700" />
              <span className="text-sm font-semibold text-blue-800">
                Comprehensive Features
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="text-gray-900">Powerful Features for</span>
              <br />
              <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Complete User Analytics
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Everything you need to understand user behavior, optimize
              conversions, and create better digital experiences.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="group px-8 py-4 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.push("/pricing")}
                className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50/50 backdrop-blur-sm border border-purple-200 mb-4">
              <SparklesIcon className="w-5 h-5 text-purple-700" />
              <span className="text-sm font-semibold text-purple-800">
                Core Capabilities
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to{" "}
              <span className="text-blue-600">Understand Users</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              8 powerful features working together to give you complete insights
              into user behavior
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mainFeatures.map((feature, index) => {
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
                  className={`group relative bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 ${hoverBorder} hover:shadow-xl transition-all duration-300 hover:-translate-y-2`}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-linear-to-br from-gray-100 to-gray-50">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How Features Work Together Section */}
      <section className="py-20 px-4 md:px-6 bg-linear-to-b from-transparent via-blue-50/30 to-transparent">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 backdrop-blur-sm border border-blue-200 mb-4">
              <CodeBracketIcon className="w-5 h-5 text-blue-700" />
              <span className="text-sm font-semibold text-blue-800">
                Integrated Platform
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How Features Work <span className="text-blue-600">Together</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our integrated platform combines multiple analytics layers into
              one cohesive system
            </p>
          </div>

          {/* Integration Flow */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {integrations.map((integration, index) => {
              const IconComponent = integration.icon;
              return (
                <div key={index} className="relative">
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                    <IconComponent className="w-12 h-12 text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {integration.title}
                    </h3>
                    <p className="text-gray-600">{integration.description}</p>
                  </div>

                  {/* Connector Line */}
                  {index < integrations.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-linear-to-r from-blue-400 to-transparent" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Integration Description */}
          <div className="mt-12 bg-white/60 backdrop-blur-md rounded-2xl p-8 border border-white/50">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <h4 className="text-2xl font-bold text-blue-600 mb-2">100%</h4>
                <p className="text-gray-600">Data Integration</p>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-purple-600 mb-2">
                  Real-Time
                </h4>
                <p className="text-gray-600">Synchronized Updates</p>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-blue-600 mb-2">
                  Unified
                </h4>
                <p className="text-gray-600">Single Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/50 backdrop-blur-sm border border-emerald-200 mb-4">
              <TrophyIcon className="w-5 h-5 text-emerald-700" />
              <span className="text-sm font-semibold text-emerald-800">
                Why Choose Us
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose <span className="text-blue-600">Navlens</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what makes us the best choice for user analytics
            </p>
          </div>

          {/* Comparison Table */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 overflow-hidden shadow-lg">
              {comparison.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-5 ${
                    index !== comparison.length - 1
                      ? "border-b border-gray-200"
                      : ""
                  } hover:bg-blue-50/30 transition-colors`}
                >
                  <div className="font-semibold text-gray-900">
                    {item.feature}
                  </div>
                  <div>
                    {item.us ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50/50 backdrop-blur-sm border border-orange-200 mb-4">
              <PresentationChartLineIcon className="w-5 h-5 text-orange-700" />
              <span className="text-sm font-semibold text-orange-800">
                Real-World Applications
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Use Cases & <span className="text-blue-600">Success Stories</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how different industries leverage Navlens to optimize their
              platforms
            </p>
          </div>

          {/* Use Cases Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => {
              const IconComponent = useCase.icon;
              return (
                <div
                  key={index}
                  className={`p-8 rounded-2xl bg-linear-to-br ${useCase.gradient} border ${useCase.border} hover:shadow-lg transition-all duration-300 group`}
                >
                  <IconComponent className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="bg-linear-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-md rounded-3xl p-12 md:p-16 text-center border border-white/20 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Transform Your Analytics?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
              Join thousands of websites using Navlens to understand their users
              better and optimize their experiences for conversions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="group px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                Get Started Free
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.push("/pricing")}
                className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold border-2 border-white hover:bg-white/30 transition-all duration-300"
              >
                View Pricing Plans
              </button>
            </div>
            <p className="text-white/80 text-sm mt-8">
              No credit card required • 14-day free trial • Full feature access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
