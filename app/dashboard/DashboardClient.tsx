"use client";

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
import useSWR from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";
import { secureApi } from "@/lib/secureApi";

// 1. Define a "Fetcher" (Standard wrapper for browser fetch with decryption)
const fetcher = async () => {
  return await secureApi.dashboard.stats() as unknown as DashboardStats;
};

// --- Type Definitions ---
// (Keep your interfaces the same)
interface DashboardStats {
  totalSites: number;
  stats: {
    totalClicks: {
      value: number;
      trend: { value: number; isPositive: boolean };
    };
    activeSessions: {
      value: number;
      trend: { value: number; isPositive: boolean };
    };
    totalHeatmaps: {
      value: number;
      trend: { value: number; isPositive: boolean };
    };
  };
}

interface Stat {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: { value: number; isPositive: boolean };
}

// Map the API data to your Stat Card format
function mapStatsToCards(data: DashboardStats | undefined): Stat[] {
  if (!data) return [];

  return [
    {
      name: "Total Sites",
      value: data.totalSites,
      icon: ChartBarIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: { value: 0, isPositive: true }, // Add trend if you have it
    },
    {
      name: "Total Clicks",
      value: data.stats.totalClicks.value,
      icon: CursorArrowRaysIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: data.stats.totalClicks.trend,
    },
    {
      name: "Active Sessions (24h)",
      value: data.stats.activeSessions.value,
      icon: EyeIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: data.stats.activeSessions.trend,
    },
    {
      name: "Heatmaps Generated",
      value: data.stats.totalHeatmaps.value,
      icon: SparklesIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: data.stats.totalHeatmaps.trend,
    },
  ];
}

const DashboardClient: React.FC = () => {
  // 2. USE SWR INSTEAD OF USEEFFECT
  // - Key: "/api/dashboard-stats" (The URL is the unique ID for the cache)
  // - Fetcher: The function to call if data is missing
  // - Options:
  //    - refreshInterval: Auto-refresh every 30s
  //    - dedupingInterval: Don't ask server again if data is less than 1 min old (Solves your navigation issue!)
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    "/api/dashboard-stats",
    fetcher,
    {
      refreshInterval: 30000,
      dedupingInterval: 60000, // <--- THE MAGIC FIX: Cache is valid for 60s
      revalidateOnFocus: false, // Optional: Don't refetch just because I clicked the window
    }
  );

  const stats = mapStatsToCards(data);

  const handleRefresh = () => {
    // SWR's mutate function forces a re-fetch instantly
    mutate();
  };

  if (error)
    return <div className="text-red-500">Failed to load dashboard</div>;

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
                  className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  Refresh Stats
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
                  {stat.trend && stat.trend.value > 0 && (
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
