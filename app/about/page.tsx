"use client";

import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  HeartIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UsersIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowRightIcon,
  SparklesIcon,
  BoltIcon,
  CheckCircleIcon,
  FireIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

const AboutPage: React.FC = () => {
  const router = useRouter();

  const values = [
    {
      icon: <ShieldCheckIcon className="w-8 h-8 text-blue-600" />,
      title: "Privacy First",
      description:
        "We believe user privacy is paramount. Our analytics never collect personal information, ensuring complete anonymity for your visitors.",
    },
    {
      icon: <LightBulbIcon className="w-8 h-8 text-purple-600" />,
      title: "Innovation Driven",
      description:
        "We continuously push the boundaries of user analytics, developing cutting-edge technology to provide deeper insights.",
    },
    {
      icon: <HeartIcon className="w-8 h-8 text-blue-600" />,
      title: "Customer Success",
      description:
        "Every decision we make is guided by our commitment to helping our customers succeed and grow their businesses.",
    },
    {
      icon: <SparklesIcon className="w-8 h-8 text-purple-600" />,
      title: "Transparency",
      description:
        "We're honest about our capabilities and pricing. No hidden fees or surprise changes to our platform.",
    },
    {
      icon: <RocketLaunchIcon className="w-8 h-8 text-blue-600" />,
      title: "User-Centric Design",
      description:
        "Our interface is built for everyone. Complex analytics made simple and intuitive for any skill level.",
    },
    {
      icon: <GlobeAltIcon className="w-8 h-8 text-purple-600" />,
      title: "Accessibility",
      description:
        "We make powerful analytics tools accessible to businesses of all sizes, from startups to enterprise organizations.",
    },
  ];

  const differentiators = [
    {
      icon: <ChartBarIcon className="w-8 h-8 text-white" />,
      title: "Real-Time Heatmaps",
      description:
        "See visitor interactions as they happen. No delays, no lag - pure real-time analytics visualization.",
    },
    {
      icon: <BoltIcon className="w-8 h-8 text-white" />,
      title: "Lightning Fast",
      description:
        "Minimal impact on page performance. Our tracking script is under 20KB and optimized for speed.",
    },
    {
      icon: <ShieldCheckIcon className="w-8 h-8 text-white" />,
      title: "GDPR Compliant",
      description:
        "Fully compliant with GDPR, CCPA, and other privacy regulations. No personal data collected ever.",
    },
    {
      icon: <SparklesIcon className="w-8 h-8 text-white" />,
      title: "AI-Powered Insights",
      description:
        "Get intelligent recommendations powered by machine learning to optimize your conversion rates.",
    },
  ];

  const stats = [
    {
      number: "3+",
      label: "Years in Business",
      icon: <TrophyIcon className="w-8 h-8 text-blue-600" />,
    },
    {
      number: "10K+",
      label: "Happy Customers",
      icon: <UsersIcon className="w-8 h-8 text-purple-600" />,
    },
    {
      number: "50M+",
      label: "Events Processed",
      icon: <FireIcon className="w-8 h-8 text-blue-600" />,
    },
    {
      number: "99.9%",
      label: "Uptime",
      icon: <CheckCircleIcon className="w-8 h-8 text-purple-600" />,
    },
  ];

  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-32 pb-20 px-4 md:px-6 relative">
        {/* Background Gradient Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

        <div className="container mx-auto max-w-7xl">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50/50 backdrop-blur-sm border border-purple-200">
              <HeartIcon className="w-5 h-5 text-purple-700" />
              <span className="text-sm font-semibold text-purple-800">
                About Our Mission
              </span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-gray-900">About</span>
                <br />
                <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Navlens
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Transforming how businesses understand and optimize user
                interactions with beautiful, privacy-first analytics.
              </p>
            </div>

            {/* Floating Stats */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  10K+
                </div>
                <div className="text-gray-600 font-medium">Active Users</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  50M+
                </div>
                <div className="text-gray-600 font-medium">Events Tracked</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  99.9%
                </div>
                <div className="text-gray-600 font-medium">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 backdrop-blur-sm border border-blue-200 mb-4">
                <SparklesIcon className="w-5 h-5 text-blue-700" />
                <span className="text-sm font-semibold text-blue-800">
                  Our Journey
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Our <span className="text-blue-600">Story</span>
              </h2>
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-12 border border-white/50 shadow-sm">
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  Founded in 2022, Navlens emerged from a simple observation:
                  businesses were flying blind when it came to understanding
                  actual user behavior. While many analytics tools existed, most
                  were either too expensive, required sacrificing user privacy,
                  or were so complex they required a data scientist to
                  understand.
                </p>

                <p>
                  Our founders—a product expert from Google, a distributed
                  systems engineer from Amazon, and a UX specialist from
                  Microsoft—saw an opportunity to change this. They believed
                  every business, regardless of size, deserved access to
                  powerful, easy-to-understand analytics that respected user
                  privacy.
                </p>

                <p>
                  Today, Navlens is trusted by over 10,000 websites across 50
                  countries, processing 50+ million user events daily. Our
                  customers range from solo entrepreneurs to Fortune 500
                  companies, all using Navlens to make data-driven decisions
                  that improve their digital experiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50/50 backdrop-blur-sm border border-purple-200 mb-4">
              <BoltIcon className="w-5 h-5 text-purple-700" />
              <span className="text-sm font-semibold text-purple-800">
                Core Principles
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our <span className="text-purple-600">Values</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide every decision we make
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="group relative bg-transparent backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="w-14 h-14 rounded-xl bg-blue-100 shadow-md shadow-blue-600/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 backdrop-blur-sm border border-blue-200 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-blue-700" />
              <span className="text-sm font-semibold text-blue-800">
                Why Choose Us
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Sets Us <span className="text-blue-600">Apart</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Industry-leading features that make a real difference
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {differentiators.map((item, index) => (
              <div
                key={index}
                className="group relative bg-transparent backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-blue-600 to-purple-600 shadow-md shadow-purple-600/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* By The Numbers Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50/50 backdrop-blur-sm border border-pink-200 mb-4">
              <FireIcon className="w-5 h-5 text-pink-700" />
              <span className="text-sm font-semibold text-pink-800">
                By The Numbers
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Our <span className="text-purple-600">Impact</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative bg-white/70 backdrop-blur-md rounded-2xl p-8 border border-white/50 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
                <div className="text-5xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      {/* <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 backdrop-blur-sm border border-blue-200 mb-4">
              <UsersIcon className="w-5 h-5 text-blue-700" />
              <span className="text-sm font-semibold text-blue-800">
                Our Leadership
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Meet Our <span className="text-blue-600">Team</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Talented individuals united by a shared mission
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="group relative bg-transparent backdrop-blur-sm rounded-2xl p-8 border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div
                  className={`w-20 h-20 rounded-2xl bg-linear-to-br ${member.color} mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center`}
                >
                  <UsersIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">
                  {member.name}
                </h3>
                <p className="text-blue-600 font-semibold text-center mb-4">
                  {member.role}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Culture & Community Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-3xl border border-blue-100 p-12 md:p-16">
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-blue-200 mb-4">
                  <SparklesIcon className="w-5 h-5 text-blue-700" />
                  <span className="text-sm font-semibold text-blue-800">
                    Our Culture
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                  Culture & Community
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8 pt-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white">
                    <HeartIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    People First
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    We invest in our team&apos;s growth and well-being. Our
                    culture prioritizes work-life balance, continuous learning,
                    and professional development.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600 text-white">
                    <BoltIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Innovation Hub
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    We encourage experimentation and learning from failure. Our
                    teams have the autonomy to explore new ideas and challenge
                    the status quo.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white">
                    <GlobeAltIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Global Community
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    We&apos;re remote-friendly with a diverse, international
                    team. Diversity of thought and background drives better
                    solutions for our users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/70 backdrop-blur-md rounded-3xl p-12 md:p-16 border border-white/50 shadow-sm text-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Join Our <span className="text-blue-600">Mission</span>
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Ready to transform how you understand your users? Get started
                  today with Navlens and see the difference real analytics can
                  make for your business.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="group px-8 py-4 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Get Started Free
                  <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-900 rounded-xl font-semibold border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                >
                  Schedule Demo
                </button>
              </div>

              <p className="text-sm text-gray-600">
                No credit card required. Start free for 14 days.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AboutPage;
