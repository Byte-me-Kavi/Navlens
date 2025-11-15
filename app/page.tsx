"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { LoadingScreen } from "@/components/LoadingScreen";
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
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Home() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Minimal check - only handle OAuth code on home page
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      // There's an OAuth code, redirect to login to handle it
      router.replace(`/login?code=${code}`);
      return;
    }

    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // User is logged in, proxy will redirect to dashboard
          // Just set loading to false and proxy will handle the redirect
          return;
        }
        // Otherwise, stay on home page
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router, supabase]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-navlens-dark via-gray-900 to-black text-black overflow-x-hidden">
      <Navbar />

      {/* Hero Section with Spline 3D */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

        {/* Interactive Spotlight */}
        <SpotlightInteractive
          className="from-white via-gray-100 to-transparent"
          size={300}
          springOptions={{ bounce: 0.2 }}
        />

        <div className="container mx-auto px-6 z-10 relative">
          {/* Full-Width Interactive Card */}
          <div className="relative group/card">
            <Card className="w-full min-h-[700px] bg-white backdrop-blur-sm border-gray-200 relative overflow-hidden shadow-glow transition-all duration-300 group-hover/card:border-gray-300 group-hover/card:shadow-[0_0_40px_rgba(255,255,255,0.8)] group-hover/card:bg-gray-50">
              {/* Spotlight reactive glow overlay */}
              <div className="absolute inset-0 bg-linear-to-br from-white/20 to-gray-100/20 group-hover/card:from-white/30 group-hover/card:to-gray-100/30 transition-all duration-300 pointer-events-none" />

              {/* Additional reactive border glow */}
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow:
                    "inset 0 0 30px rgba(255, 255, 255, 0.3), inset 0 0 60px rgba(200, 200, 200, 0.2)",
                }}
              />

              {/* Content Grid Inside Interactive Card */}
              <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center p-8 md:p-12 h-full">
                {/* Left Content */}
                <div className="space-y-8 relative z-20">
                  <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-black bg-linear-to-r from-navlens-dark via-navlens-accent to-navlens-electric-blue leading-tight">
                    Visualize User Behavior Like Never Before
                  </h1>

                  <p className="text-xl md:text-2xl text-gray-700 leading-relaxed">
                    Transform raw click data into stunning heatmaps. Understand
                    how users interact with your website through{" "}
                    <span className="text-navlens-accent font-semibold">
                      intelligent analytics
                    </span>{" "}
                    and{" "}
                    <span className="text-navlens-electric-blue font-semibold">
                      3D visualizations
                    </span>
                    .
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => router.push("/login")}
                      className="group px-8 py-4 bg-linear-to-r from-navlens-accent to-navlens-electric-blue rounded-xl font-bold text-lg text-white shadow-glow hover:shadow-glow-blue transition-all duration-300 hover:scale-105 flex items-center gap-2"
                    >
                      Get Started Free
                      <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button className="group px-8 py-4 bg-gray-100 border border-gray-300 rounded-xl font-bold text-lg text-navlens-dark hover:bg-gray-200 transition-all duration-300 flex items-center gap-2">
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
                      <div className="text-sm text-gray-600">
                        Clicks Tracked
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-navlens-electric-blue">
                        10K+
                      </div>
                      <div className="text-sm text-gray-600">Heatmaps</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-navlens-purple">
                        99.9%
                      </div>
                      <div className="text-sm text-gray-600">Uptime</div>
                    </div>
                  </div>
                </div>

                {/* Right Content - 3D Spline Scene - Expanded to overlap */}
                <div className="relative h-[500px] lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[55%] lg:h-full">
                  <div className="w-full h-full transition-transform duration-300 group-hover/card:scale-105">
                    <SplineScene
                      scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-navlens-accent rounded-full flex justify-center p-2">
            <div className="w-1 h-3 bg-navlens-accent rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-navlens-accent to-navlens-purple">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-900">
              Everything you need to understand user behavior
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: CursorArrowRaysIcon,
                title: "Click Tracking",
                description:
                  "Capture every user interaction with pixel-perfect accuracy",
                gradient: "from-navlens-accent to-cyan-400",
              },
              {
                icon: ChartBarIcon,
                title: "Heatmap Analytics",
                description:
                  "Visualize hot and cold zones on your website instantly",
                gradient: "from-navlens-electric-blue to-blue-400",
              },
              {
                icon: EyeIcon,
                title: "Session Recording",
                description:
                  "Watch real user sessions to understand behavior patterns",
                gradient: "from-navlens-purple to-purple-400",
              },
              {
                icon: SparklesIcon,
                title: "AI Insights",
                description:
                  "Get intelligent recommendations powered by machine learning",
                gradient: "from-navlens-magenta to-pink-400",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="group p-6 bg-linear-to-br from-gray-900 to-black border-gray-800 hover:border-navlens-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-glow cursor-pointer"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-linear-to-br ${feature.gradient} p-3 mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  <feature.icon className="w-full h-full text-black" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-black">
                  {feature.title}
                </h3>
                <p className="text-gray-900">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative">
        <div className="container mx-auto">
          <Card className="p-12 md:p-16 bg-linear-to-br from-navlens-accent via-navlens-electric-blue to-navlens-purple border-none relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 text-center space-y-6">
              <h2 className="text-4xl md:text-6xl font-bold text-white">
                Ready to Transform Your Analytics?
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                Join thousands of companies using Navlens to understand their
                users better
              </p>
              <button
                onClick={() => router.push("/login")}
                className="group px-10 py-5 bg-white text-navlens-dark rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
