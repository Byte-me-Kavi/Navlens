/**
 * Funnel Detail Page
 *
 * Shows funnel analysis with conversion chart and stats
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import { useFunnelAnalysis, FunnelChart } from "@/features/funnels";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  ArrowLeftIcon,
  FunnelIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function FunnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.funnelId as string;

  const { selectedSiteId, sitesLoading } = useSite();

  // Date range state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // Get funnel analysis
  const {
    data: analysis,
    loading,
    error,
    refetch,
  } = useFunnelAnalysis(
    selectedSiteId && funnelId
      ? {
          funnelId,
          siteId: selectedSiteId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      : null
  );

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedSiteId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          Please select a site first to view funnel analysis.
          <button
            onClick={() => router.push("/dashboard/funnels")}
            className="ml-2 text-yellow-800 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/funnels")}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FunnelIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  {analysis?.funnel?.name || "Funnel Analysis"}
                </h1>
              </div>
              {analysis?.funnel?.description && (
                <p className="text-sm text-gray-500 ml-12">
                  {analysis.funnel.description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarDaysIcon className="w-5 h-5" />
            <span>Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {[
              { label: "7D", days: 7 },
              { label: "30D", days: 30 },
              { label: "90D", days: 90 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => {
                  const end = new Date();
                  const start = new Date(
                    Date.now() - days * 24 * 60 * 60 * 1000
                  );
                  setDateRange({
                    startDate: start.toISOString().split("T")[0],
                    endDate: end.toISOString().split("T")[0],
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Failed to load funnel analysis</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && !error && (
        <>
          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Total Sessions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.total_sessions.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Conversion Rate
              </p>
              <p
                className={`text-2xl font-bold ${
                  analysis.overall_conversion_rate >= 20
                    ? "text-green-600"
                    : analysis.overall_conversion_rate >= 10
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {analysis.overall_conversion_rate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Steps
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.step_results?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Last Analyzed
              </p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(analysis.analyzed_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Funnel Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">
                Conversion Funnel
              </h2>
            </div>

            {analysis.step_results && analysis.step_results.length > 0 ? (
              <FunnelChart
                steps={analysis.step_results}
                totalSessions={analysis.total_sessions}
              />
            ) : (
              <div className="text-center py-12">
                <FunnelIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  No data available for the selected date range
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
