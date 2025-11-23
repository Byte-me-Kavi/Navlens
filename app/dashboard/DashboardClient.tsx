"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChartBarIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  CalendarIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

// --- Type Definitions ---
interface DashboardStats {
  totalSites: number;
  totalClicks: number;
  totalHeatmaps: number;
  activeSessions: string;
}

interface Stat {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: { value: number; isPositive: boolean };
}

const DashboardClient: React.FC<{ initialStats: DashboardStats }> = ({
  initialStats,
}) => {
  const [isLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize initial stats to avoid recreating on every render
  const initialStatsArray = useMemo<Stat[]>(
    () => [
      {
        name: "Total Sites",
        value: initialStats.totalSites,
        icon: ChartBarIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        trend: { value: 12, isPositive: true },
      },
      {
        name: "Total Clicks",
        value: initialStats.totalClicks,
        icon: CursorArrowRaysIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        trend: { value: 24, isPositive: true },
      },
      {
        name: "Active Sessions",
        value: "N/A",
        icon: EyeIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        trend: { value: 8, isPositive: false },
      },
      {
        name: "Heatmaps Generated",
        value: initialStats.totalHeatmaps,
        icon: SparklesIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        trend: { value: 18, isPositive: true },
      },
    ],
    [initialStats]
  );

  const [stats, setStats] = useState<Stat[]>(initialStatsArray);

  // Fetch fresh stats from the API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard-stats", {
        cache: "no-store",
      });
      const data = await response.json();

      const newStats: Stat[] = [
        {
          name: "Total Sites",
          value: data.totalSites,
          icon: ChartBarIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          trend: { value: 12, isPositive: true },
        },
        {
          name: "Total Clicks",
          value: data.totalClicks,
          icon: CursorArrowRaysIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          trend: { value: 24, isPositive: true },
        },
        {
          name: "Active Sessions",
          value: "N/A",
          icon: EyeIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          trend: { value: 8, isPositive: false },
        },
        {
          name: "Heatmaps Generated",
          value: data.totalHeatmaps,
          icon: SparklesIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          trend: { value: 18, isPositive: true },
        },
      ];
      setStats(newStats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // Fetch stats on mount AND set up auto-refresh
  useEffect(() => {
    // Fetch immediately on mount (async)
    const loadInitialStats = async () => {
      await fetchStats();
    };
    loadInitialStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : (
        <>
          {/* Welcome Section with Refresh Button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-sm flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Welcome to Navlens Analytics
                </h1>
                <p className="text-gray-600 text-base">
                  Transform your website analytics with intelligent heatmap
                  tracking
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Stats"}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200 hover:shadow-lg hover:border-blue-400 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-600">
                    {stat.name}
                  </p>
                  {stat.trend && (
                    <div
                      className={`flex items-center gap-1 text-xs font-semibold ${
                        stat.trend.isPositive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stat.trend.isPositive ? (
                        <ArrowUpRightIcon className="w-3 h-3" />
                      ) : (
                        <ArrowDownLeftIcon className="w-3 h-3" />
                      )}
                      {stat.trend.value}%
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weekly Activity Chart */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Weekly Activity
                </h3>
              </div>
              <div className="flex items-end justify-between h-32 gap-2">
                {[65, 72, 58, 81, 75, 88, 92].map((value, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-linear-to-t from-blue-600 to-blue-400 rounded-t-lg hover:from-blue-700 hover:to-blue-500 transition-colors cursor-pointer group"
                    style={{ height: `${(value / 100) * 128}px` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center text-xs font-semibold text-white translate-y-6">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => (
                    <span key={day}>{day}</span>
                  )
                )}
              </div>
            </div>

            {/* Top Pages */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FireIcon className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-bold text-gray-900">Top Pages</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: "/home", clicks: 1240, percentage: 100 },
                  { name: "/pricing", clicks: 856, percentage: 69 },
                  { name: "/features", clicks: 642, percentage: 52 },
                  { name: "/about", clicks: 428, percentage: 35 },
                ].map((page) => (
                  <div key={page.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">
                        {page.name}
                      </span>
                      <span className="text-gray-600">{page.clicks}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-linear-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${page.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Getting Started Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Getting Started
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-0.5 text-sm">
                    Add Your First Site
                  </h3>
                  <p className="text-gray-600 text-xs">
                    Navigate to **My Sites** and add your website to start
                    tracking user interactions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-0.5 text-sm">
                    Install Tracking Script
                  </h3>
                  <p className="text-gray-600 text-xs">
                    Copy and paste the JavaScript snippet into your
                    website&apos;s HTML to begin collecting data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-0.5 text-sm">
                    View Your Heatmaps
                  </h3>
                  <p className="text-gray-600 text-xs">
                    Once data starts flowing, visualize user behavior with
                    interactive heatmaps and insights.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-600 rounded-lg p-5 text-white shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold mb-1">Add Your First Site</h3>
              <p className="text-blue-50 mb-3 text-sm">
                Start tracking user behavior in minutes
              </p>
              <Link
                href="/dashboard/my-sites"
                className="bg-white text-blue-600 px-4 py-1.5 text-sm rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-block shadow-sm"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Documentation
              </h3>
              <p className="text-gray-600 mb-3 text-sm">
                Learn how to make the most of Navlens
              </p>
              <Link
                href="/docs"
                className="bg-gray-100 text-gray-700 px-4 py-1.5 text-sm rounded-lg font-semibold hover:bg-gray-200 transition-colors inline-block"
              >
                View Docs
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardClient;
