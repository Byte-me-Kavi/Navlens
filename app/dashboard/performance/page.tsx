"use client";

import React, { useEffect, useState } from "react";
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import { useDateRange } from "@/context/DateRangeContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import DateRangePicker from "@/components/ui/DateRangePicker";
import {
  FiActivity,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

interface PerformanceData {
  trends: Array<{
    time_bucket: string;
    avg_lcp: number;
    avg_cls: number;
    avg_inp: number;
    avg_fcp: number;
    avg_ttfb: number;
    sessions: number;
  }>;
  deviceBreakdown: Array<{
    device_type: string;
    avg_lcp: number;
    avg_cls: number;
    avg_inp: number;
    avg_fcp: number;
    avg_ttfb: number;
    sessions: number;
    total_events?: number;
  }>;
  browserBreakdown: Array<{
    browser: string;
    avg_lcp: number;
    avg_cls: number;
    sessions: number;
  }>;
  overall: {
    avgLcp: number;
    avgCls: string;
    avgInp: number;
    avgFcp: number;
    avgTtfb: number;
    totalSessions: number;
  };
}

// Get performance grade based on LCP
const getGrade = (lcp: number): { grade: string; color: string; icon: React.ReactNode } => {
  if (lcp <= 2500) return { grade: "Good", color: "text-green-600", icon: <FiCheckCircle /> };
  if (lcp <= 4000) return { grade: "Needs Work", color: "text-yellow-600", icon: <FiAlertCircle /> };
  return { grade: "Poor", color: "text-red-600", icon: <FiAlertCircle /> };
};

// Metric card component
const MetricCard = ({ label, value, unit, description, threshold }: {
  label: string;
  value: number | string;
  unit: string;
  description: string;
  threshold?: { good: number; needsWork: number };
}) => {
  let statusColor = "text-gray-600";
  if (threshold && typeof value === "number") {
    if (value <= threshold.good) statusColor = "text-green-600";
    else if (value <= threshold.needsWork) statusColor = "text-yellow-600";
    else statusColor = "text-red-600";
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`text-3xl font-bold ${statusColor}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
        <span className="text-lg ml-1 font-normal text-gray-400">{unit}</span>
      </div>
      <div className="text-xs text-gray-500 mt-2">{description}</div>
    </div>
  );
};

// Device breakdown component
const DeviceBreakdownCard = ({ data }: { data: PerformanceData["deviceBreakdown"] }) => {
  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mobile": return <FiSmartphone className="w-5 h-5" />;
      case "tablet": return <FiTablet className="w-5 h-5" />;
      default: return <FiMonitor className="w-5 h-5" />;
    }
  };

  // Calculate total sessions for percentage
  const totalSessions = data.reduce((sum, d) => sum + Number(d.sessions || 0), 0);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiMonitor className="w-4 h-4 text-blue-600" />
        Traffic by Device
      </h3>
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">No device data available</div>
        ) : (
          data.map((device) => {
            const sessionCount = Number(device.sessions) || 0;
            const percentage = totalSessions > 0 ? ((sessionCount / totalSessions) * 100).toFixed(1) : '0';
            return (
              <div key={device.device_type} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {getDeviceIcon(device.device_type)}
                </div>
                <div className="flex-1">
                  <div className="font-medium capitalize">{device.device_type || "Unknown"}</div>
                  <div className="text-xs text-gray-500">{sessionCount.toLocaleString()} sessions</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600 text-lg">{percentage}%</div>
                  <div className="text-xs text-gray-500">of traffic</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default function PerformanceDashboard() {
  const { selectedSiteId, sites, sitesLoading } = useSite();
  const { dateRange, formatForApi } = useDateRange();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSiteId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = formatForApi();
        const result = await secureApi.performance.metrics({
          siteId: selectedSiteId,
          startDate,
          endDate,
        }) as any;
        
        // Convert string values to numbers (ClickHouse returns strings)
          const parsed = {
            ...result,
            overall: {
              avgLcp: Number(result.overall?.avgLcp) || 0,
              avgCls: result.overall?.avgCls || "0",
              avgInp: Number(result.overall?.avgInp) || 0,
              avgFcp: Number(result.overall?.avgFcp) || 0,
              avgTtfb: Number(result.overall?.avgTtfb) || 0,
              totalSessions: Number(result.overall?.totalSessions) || 0,
            },
            deviceBreakdown: (result.deviceBreakdown || []).map((d: Record<string, unknown>) => ({
              ...d,
              sessions: Number(d.sessions) || 0,
              total_events: Number(d.total_events) || 0,
              avg_lcp: Number(d.avg_lcp) || 0,
            })),
          };
          console.log('[PerformanceDashboard] Parsed data:', parsed);
          setData(parsed);
      } catch (error) {
        console.error("Failed to fetch performance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSiteId, dateRange, formatForApi]);

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (sites.length === 0) {
    return <NoSitesAvailable />;
  }

  if (!selectedSiteId) {
    return (
      <NoSiteSelected
        featureName="performance metrics"
        description="View Core Web Vitals and performance trends for your site."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Loading performance data..." />
      </div>
    );
  }

  const overall = data?.overall || {
    avgLcp: 0,
    avgCls: "0",
    avgInp: 0,
    avgFcp: 0,
    avgTtfb: 0,
    totalSessions: 0,
  };

  const grade = getGrade(overall.avgLcp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiActivity className="w-6 h-6 text-blue-600" />
              Performance Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Core Web Vitals and performance insights
            </p>
          </div>
          <DateRangePicker />
        </div>

        {/* Performance Grade */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-100 text-sm mb-1">Overall Performance</div>
              <div className="text-4xl font-bold flex items-center gap-3">
                {grade.icon}
                {grade.grade}
              </div>
              <div className="text-blue-200 mt-2">
                Based on {overall.totalSessions.toLocaleString()} sessions
              </div>
            </div>
            <div className="text-right">
              <FiTrendingUp className="w-16 h-16 text-blue-300/50" />
            </div>
          </div>
        </div>

        {/* Core Web Vitals Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard
            label="LCP"
            value={overall.avgLcp}
            unit="ms"
            description="Largest Contentful Paint"
            threshold={{ good: 2500, needsWork: 4000 }}
          />
          <MetricCard
            label="CLS"
            value={parseFloat(overall.avgCls)}
            unit=""
            description="Cumulative Layout Shift"
            threshold={{ good: 0.1, needsWork: 0.25 }}
          />
          <MetricCard
            label="INP"
            value={overall.avgInp}
            unit="ms"
            description="Interaction to Next Paint"
            threshold={{ good: 200, needsWork: 500 }}
          />
          <MetricCard
            label="FCP"
            value={overall.avgFcp}
            unit="ms"
            description="First Contentful Paint"
            threshold={{ good: 1800, needsWork: 3000 }}
          />
          <MetricCard
            label="TTFB"
            value={overall.avgTtfb}
            unit="ms"
            description="Time to First Byte"
            threshold={{ good: 800, needsWork: 1800 }}
          />
        </div>

        {/* Device Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <DeviceBreakdownCard data={data?.deviceBreakdown || []} />

          {/* Browser Breakdown */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiMonitor className="w-4 h-4 text-blue-600" />
              Traffic by Browser
            </h3>
            <div className="space-y-3">
              {(!data?.browserBreakdown || data.browserBreakdown.length === 0) ? (
                <div className="text-gray-500 text-sm text-center py-4">No browser data available</div>
              ) : (() => {
                const totalBrowserSessions = data.browserBreakdown.reduce((sum, b) => sum + Number(b.sessions || 0), 0);
                return data.browserBreakdown.map((browser) => {
                  const sessionCount = Number(browser.sessions) || 0;
                  const percentage = totalBrowserSessions > 0 ? ((sessionCount / totalBrowserSessions) * 100).toFixed(1) : '0';
                  return (
                    <div key={browser.browser} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{browser.browser || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{sessionCount.toLocaleString()} sessions</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600 text-lg">{percentage}%</div>
                        <div className="text-xs text-gray-500">of traffic</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Performance metrics are collected from users with the tracking script installed.
            Install Core Web Vitals tracking to start collecting data.
          </p>
        </div>
      </div>
    </div>
  );
}
