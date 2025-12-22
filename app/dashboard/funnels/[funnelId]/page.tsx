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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard/funnels")}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <FunnelIcon className="w-5 h-5 text-indigo-600" />
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
            <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
            <span>Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            <span className="text-gray-400 font-medium">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
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
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
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
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 flex items-center gap-3">
           <div className="p-2 bg-red-100 rounded-full">
             <span className="text-xl">⚠️</span>
           </div>
           <div>
             <h3 className="font-bold">Failed to load analysis</h3>
             <p className="text-sm">{error.message}</p>
           </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !loading && !error && (
        <>
          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                Total Sessions
              </p>
              <div className="flex items-end justify-between">
                 <p className="text-2xl font-bold text-gray-900">
                   {analysis.total_sessions.toLocaleString()}
                 </p>
                 <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <ChartBarIcon className="w-5 h-5" />
                 </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Conversion Rate
              </p>
               <div className="flex items-end justify-between">
                  <p
                    className={`text-2xl font-bold ${
                      analysis.overall_conversion_rate >= 20
                        ? "text-emerald-600"
                        : analysis.overall_conversion_rate >= 10
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {analysis.overall_conversion_rate.toFixed(1)}%
                  </p>
                   <div className={`p-2 rounded-lg ${
                      analysis.overall_conversion_rate >= 20
                        ? "bg-emerald-50 text-emerald-600"
                        : analysis.overall_conversion_rate >= 10
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                   }`}>
                      <ArrowPathIcon className="w-5 h-5" />
                   </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Steps
              </p>
               <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900">
                    {analysis.step_results?.length || 0}
                  </p>
                   <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <span className="font-mono text-xs font-bold">1-2-3</span>
                   </div>
               </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Last Analyzed
              </p>
               <div className="flex items-end justify-between">
                  <div>
                     <p className="text-sm font-bold text-gray-900">
                       {new Date(analysis.analyzed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </p>
                     <p className="text-xs text-gray-400 mt-0.5">
                       {new Date(analysis.analyzed_at).toLocaleDateString()}
                     </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg text-indigo-600">
                      <CalendarDaysIcon className="w-5 h-5" />
                  </div>
               </div>
            </div>
          </div>

          {/* Funnel Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-8 border-b border-gray-100 pb-4">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                 <ChartBarIcon className="w-5 h-5 text-indigo-600" />
              </div>
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
              <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                    <FunnelIcon className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-gray-900 font-semibold mb-1">No data available</h3>
                <p className="text-gray-500 text-sm">
                  Try adjusting the date range to see funnel performance.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
