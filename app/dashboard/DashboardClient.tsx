"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChartBarIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  SparklesIcon,
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
      },
      {
        name: "Total Clicks",
        value: initialStats.totalClicks,
        icon: CursorArrowRaysIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        name: "Active Sessions",
        value: "N/A",
        icon: EyeIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        name: "Heatmaps Generated",
        value: initialStats.totalHeatmaps,
        icon: SparklesIcon,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
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
        },
        {
          name: "Total Clicks",
          value: data.totalClicks,
          icon: CursorArrowRaysIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          name: "Active Sessions",
          value: "N/A",
          icon: EyeIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          name: "Heatmaps Generated",
          value: data.totalHeatmaps,
          icon: SparklesIcon,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="bg-white border-2 border-blue-200 rounded-xl p-8 shadow-sm flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome to Navlens
                </h1>
                <p className="text-gray-600 text-lg">
                  Transform your website analytics with intelligent heatmap
                  tracking
                </p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Stats"}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.name}
                className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      {stat.name}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Getting Started Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Getting Started
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Add Your First Site
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Navigate to **My Sites** and add your website to start
                    tracking user interactions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Install Tracking Script
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Copy and paste the JavaScript snippet into your website’s
                    HTML to begin collecting data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    View Your Heatmaps
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Once data starts flowing, visualize user behavior with
                    interactive heatmaps and insights.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-600 rounded-lg p-6 text-white shadow-sm">
              <h3 className="text-xl font-bold mb-2">Add Your First Site</h3>
              <p className="text-blue-50 mb-4">
                Start tracking user behavior in minutes
              </p>
              <Link
                href="/dashboard/sites"
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-block"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Documentation
              </h3>
              <p className="text-gray-600 mb-4">
                Learn how to make the most of Navlens
              </p>
              <Link
                href="/docs"
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors inline-block"
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
