"use client";

import React from "react";
import {
  PuzzlePieceIcon,
  SunIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

// --- COLOR CONSTANTS (Tailwind classes) ---
const colors = {
  primary: "text-blue-500",
  dark: "text-blue-900",
  accent: "text-cyan-500",
  bg: "bg-gray-50",
  cardBg: "bg-white",
  textPrimary: "text-gray-900",
  textSecondary: "text-gray-500",
  border: "border-gray-200",
  success: "text-green-500",
};

const DocumentationPage: React.FC = () => {
  return (
    <>
      <Navbar />

      <div className={`mt-15 min-h-screen ${colors.bg}`}>
        <div className="container mx-auto py-10 px-6 max-w-4xl">
          <header className="mb-8">
            <h1 className={`text-4xl font-extrabold ${colors.dark}`}>
              Navlens User Guide & Quick Start
            </h1>
            <p className={`mt-2 text-lg ${colors.textSecondary}`}>
              Stop guessing what your visitors are doing. Start seeing where
              they click, scroll, and get stuck.
            </p>
          </header>

          {/* --- SECTION 1: CORE VALUE --- */}
          <section
            className={`mb-10 p-6 rounded-xl shadow-lg ${colors.cardBg} border ${colors.border}`}
          >
            <h2 className={`text-2xl font-bold mb-6 ${colors.textPrimary}`}>
              1. What Navlens Does for You
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <SunIcon className={`w-6 h-6 shrink-0 ${colors.accent}`} />
                <div>
                  <h3 className={`font-semibold ${colors.textPrimary}`}>
                    Visualize Clarity
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    Navlens turns complex visitor data into instant
                    **Heatmaps**. You&apos;ll see exactly where users focus (red
                    spots) and what content they ignore (blue spots) across your
                    entire website.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <PuzzlePieceIcon
                  className={`w-6 h-6 shrink-0 ${colors.success}`}
                />
                <div>
                  <h3 className={`font-semibold ${colors.textPrimary}`}>
                    Device-Specific Insights
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    Analyze clicks and scroll depth separately for **Desktop,
                    Tablet, and Mobile** users. This ensures you fix the right
                    problem for the right audience, maximizing conversions on
                    all devices.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* --- SECTION 2: INSTALLATION --- */}
          <section
            className={`mb-10 p-6 rounded-xl shadow-lg ${colors.cardBg} border ${colors.border}`}
          >
            <h2 className={`text-2xl font-bold mb-6 ${colors.textPrimary}`}>
              2. Quick Setup: Activating Tracking
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className={`text-2xl font-bold ${colors.primary}`}>1.</div>
                <div>
                  <h3 className={`font-semibold ${colors.textPrimary}`}>
                    Get Your Unique Code
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    After logging in and registering your website on the **My
                    Sites** page, copy the custom code generated for your
                    domain.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className={`text-2xl font-bold ${colors.primary}`}>2.</div>
                <div>
                  <h3 className={`font-semibold ${colors.textPrimary}`}>
                    Installation
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    Paste the entire `&lt;script&gt;` tag into the
                    **&lt;head&gt;** section of every page you want to track.
                  </p>
                  <div
                    className={`p-4 rounded-lg bg-gray-100 border ${colors.border} text-sm ${colors.textPrimary} font-mono mt-2`}
                  >
                    &lt;head&gt;
                    <div className="pl-4">...</div>
                    <div className="pl-4 font-bold text-blue-600">
                      **&lt;script async src=&quot;...&quot;
                      data-site-id=&quot;...&quot;&gt;&lt;/script&gt;**
                    </div>
                    <div className="pl-4">...</div>
                    &lt;/head&gt;
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className={`text-2xl font-bold ${colors.primary}`}>3.</div>
                <div>
                  <h3 className={`font-semibold ${colors.textPrimary}`}>
                    Wait for Data
                  </h3>
                  <p className={`text-sm ${colors.textSecondary}`}>
                    Allow up to 5 minutes for user clicks and scrolls to be
                    processed and appear in your dashboard&apos;s Heatmap
                    viewer.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* --- FOOTER LINK --- */}
          <div className="mt-8 pt-4 border-t text-center">
            <Link
              href="/dashboard/login"
              className={`font-medium ${colors.primary} hover:underline flex items-center justify-center gap-2`}
            >
              Login to Your Dashboard <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default DocumentationPage;
