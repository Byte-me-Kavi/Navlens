"use client";

import React from "react";
import {
  HeartIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  UsersIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowRightIcon,
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

const AboutPage: React.FC = () => {
  const values = [
    {
      icon: <ShieldCheckIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Privacy First",
      description:
        "We believe user privacy is paramount. Our analytics never collect personal information, ensuring complete anonymity for your visitors.",
    },
    {
      icon: <LightBulbIcon className={`w-8 h-8 ${colors.purple}`} />,
      title: "Innovation Driven",
      description:
        "We continuously push the boundaries of user analytics, developing cutting-edge technology to provide deeper insights.",
    },
    {
      icon: <HeartIcon className={`w-8 h-8 ${colors.success}`} />,
      title: "Customer Obsessed",
      description:
        "Every decision we make is guided by our commitment to helping our customers succeed and grow their businesses.",
    },
    {
      icon: <GlobeAltIcon className={`w-8 h-8 ${colors.primary}`} />,
      title: "Accessibility",
      description:
        "We make powerful analytics tools accessible to businesses of all sizes, from startups to enterprise organizations.",
    },
  ];

  const stats = [
    { number: "10,000+", label: "Websites Tracked" },
    { number: "50M+", label: "Monthly Pageviews" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support Available" },
  ];

  const team = [
    {
      name: "Sarah Chen",
      role: "CEO & Co-Founder",
      bio: "Former product manager at Google with 10+ years in user experience and analytics.",
      image: "/api/placeholder/150/150",
    },
    {
      name: "Marcus Rodriguez",
      role: "CTO & Co-Founder",
      bio: "Ex-Amazon engineer specializing in scalable data systems and machine learning.",
      image: "/api/placeholder/150/150",
    },
    {
      name: "Emily Watson",
      role: "Head of Product",
      bio: "Product leader with experience at Microsoft and a passion for user-centered design.",
      image: "/api/placeholder/150/150",
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
              <HeartIcon className="w-4 h-4" />
              Our Story
            </div>
            <h1 className={`text-5xl font-bold ${colors.dark} mb-6`}>
              Transforming How Businesses Understand Users
            </h1>
            <p
              className={`text-xl ${colors.textSecondary} max-w-3xl mx-auto leading-relaxed`}
            >
              Founded in 2023, Navlens was born from a simple belief: every
              website owner deserves to see their site through their
              visitors&apos; eyes. We&apos;re on a mission to make user
              analytics accessible, privacy-focused, and actionable for
              businesses worldwide.
            </p>
          </header>

          {/* Mission Section */}
          <section
            className={`mb-20 p-12 rounded-2xl ${colors.cardBg} border ${colors.border} shadow-sm`}
          >
            <div className="text-center max-w-4xl mx-auto">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-6`}>
                Our Mission
              </h2>
              <p
                className={`text-xl ${colors.textSecondary} leading-relaxed mb-8`}
              >
                To democratize user analytics by providing businesses of all
                sizes with powerful, privacy-respecting tools that reveal how
                visitors actually interact with their websites. We believe that
                understanding user behavior shouldn&apos;t require sacrificing
                privacy or breaking the bank.
              </p>
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UsersIcon className={`w-8 h-8 ${colors.primary}`} />
                  </div>
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                  >
                    For Everyone
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    From solo entrepreneurs to enterprise teams
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheckIcon className={`w-8 h-8 ${colors.purple}`} />
                  </div>
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                  >
                    Privacy First
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    No personal data collection, ever
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ChartBarIcon className={`w-8 h-8 ${colors.success}`} />
                  </div>
                  <h3
                    className={`text-lg font-semibold ${colors.textPrimary} mb-2`}
                  >
                    Actionable Insights
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    Clear, visual data that drives decisions
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="mb-20">
            <div className="grid md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`text-center p-8 rounded-2xl ${colors.cardBg} border ${colors.border} shadow-sm`}
                >
                  <div className={`text-4xl font-bold ${colors.primary} mb-2`}>
                    {stat.number}
                  </div>
                  <div
                    className={`text-lg font-semibold ${colors.textPrimary}`}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Values Section */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Our Values
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-2xl ${colors.cardBg} border ${colors.border} shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-xl shrink-0">
                      {value.icon}
                    </div>
                    <div>
                      <h3
                        className={`text-xl font-bold ${colors.textPrimary} mb-3`}
                      >
                        {value.title}
                      </h3>
                      <p
                        className={`text-base ${colors.textSecondary} leading-relaxed`}
                      >
                        {value.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Story Section */}
          <section
            className={`mb-20 p-12 rounded-2xl bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100`}
          >
            <div className="max-w-4xl mx-auto text-center">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-6`}>
                The Problem We Solve
              </h2>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3
                    className={`text-xl font-semibold ${colors.textPrimary} mb-4`}
                  >
                    Before Navlens
                  </h3>
                  <ul
                    className={`text-base ${colors.textSecondary} space-y-3 text-left`}
                  >
                    <li>• Guessing what users want based on incomplete data</li>
                    <li>• Expensive analytics tools that compromise privacy</li>
                    <li>
                      • Complex dashboards that require data science expertise
                    </li>
                    <li>
                      • Generic insights that don&apos;t apply to your specific
                      users
                    </li>
                    <li>• No visibility into mobile user behavior</li>
                  </ul>
                </div>
                <div>
                  <h3
                    className={`text-xl font-semibold ${colors.textPrimary} mb-4`}
                  >
                    With Navlens
                  </h3>
                  <ul
                    className={`text-base ${colors.textSecondary} space-y-3 text-left`}
                  >
                    <li>
                      • See exactly where users click, scroll, and get stuck
                    </li>
                    <li>
                      • Privacy-compliant analytics that protect user data
                    </li>
                    <li>• Intuitive heatmaps that anyone can understand</li>
                    <li>• Device-specific insights for mobile and desktop</li>
                    <li>• Actionable data that drives real business results</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Meet Our Team
              </h2>
              <p className={`text-lg ${colors.textSecondary}`}>
                The passionate experts behind Navlens
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <div
                  key={index}
                  className={`text-center p-8 rounded-2xl ${colors.cardBg} border ${colors.border} shadow-sm`}
                >
                  <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <UsersIcon className={`w-12 h-12 ${colors.primary}`} />
                  </div>
                  <h3
                    className={`text-xl font-bold ${colors.textPrimary} mb-2`}
                  >
                    {member.name}
                  </h3>
                  <p className={`text-blue-600 font-medium mb-4`}>
                    {member.role}
                  </p>
                  <p
                    className={`text-sm ${colors.textSecondary} leading-relaxed`}
                  >
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section
            className={`p-12 rounded-2xl shadow-sm ${colors.cardBg} border ${colors.border} text-center`}
          >
            <div className="max-w-2xl mx-auto">
              <h2 className={`text-3xl font-bold ${colors.textPrimary} mb-4`}>
                Join Our Mission
              </h2>
              <p className={`text-lg ${colors.textSecondary} mb-8`}>
                Help us make user analytics better for everyone. Whether
                you&apos;re a developer, designer, or business owner,
                there&apos;s a place for you in our growing community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/dashboard/login"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 ${colors.primaryBg} text-white rounded-xl hover:${colors.primaryHover} transition-all duration-200 font-semibold text-lg shadow-sm hover:shadow-lg`}
                >
                  Start Using Navlens <ArrowRightIcon className="w-5 h-5" />
                </Link>
                <Link
                  href="/careers"
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg`}
                >
                  Join Our Team
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
