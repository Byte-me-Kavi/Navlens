"use client";

import React, { useEffect, useState } from "react";
import { secureApi } from "@/lib/secureApi";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiXCircle,
  FiWifi,
  FiClock,
  FiArrowDown,
  FiArrowUp,
  FiServer,
  FiGlobe,
  FiZap,
} from "react-icons/fi";

// =============================================================================
// Interfaces
// =============================================================================

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

interface NetworkHealthData {
  overview: {
    totalRequests: number;
    successfulRequests: number;
    clientErrors: number;
    serverErrors: number;
    errorRate: number;
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    healthScore: 'healthy' | 'degraded' | 'critical';
  };
  trends: Array<{
    time_bucket: string;
    total_requests: number;
    error_count: number;
    error_rate: number;
    avg_latency: number;
  }>;
  topFailingEndpoints: Array<{
    url: string;
    method: string;
    total_requests: number;
    error_count: number;
    error_rate: number;
    avg_latency: number;
    last_seen: string;
  }>;
  pageAlerts: Array<{
    page_path: string;
    total_requests: number;
    error_count: number;
    error_rate: number;
    severity: 'warning' | 'critical';
  }>;
  recentErrors: Array<{
    timestamp: string;
    url: string;
    method: string;
    status: number;
    duration_ms: number;
    page_path: string;
  }>;
  statusCodeDistribution: Array<{
    status_code: number;
    count: number;
    category: 'success' | 'redirect' | 'client_error' | 'server_error';
  }>;
}

// =============================================================================
// Helper Functions
// =============================================================================

const getHealthConfig = (score: 'healthy' | 'degraded' | 'critical') => {
  switch (score) {
    case 'healthy':
      return {
        bgClass: 'bg-emerald-600',
        icon: <FiCheckCircle className="w-8 h-8" />,
        label: 'Healthy',
        description: 'Network is performing well',
      };
    case 'degraded':
      return {
        bgClass: 'bg-amber-600',
        icon: <FiAlertTriangle className="w-8 h-8" />,
        label: 'Degraded',
        description: 'Some errors detected',
      };
    case 'critical':
      return {
        bgClass: 'bg-red-600',
        icon: <FiXCircle className="w-8 h-8" />,
        label: 'Critical',
        description: 'High error rate detected',
      };
  }
};

const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getMethodColor = (method: string): string => {
  switch (method?.toUpperCase()) {
    case 'GET': return 'bg-blue-100 text-blue-700';
    case 'POST': return 'bg-green-100 text-green-700';
    case 'PUT': return 'bg-amber-100 text-amber-700';
    case 'DELETE': return 'bg-red-100 text-red-700';
    case 'PATCH': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-green-600 bg-green-50';
  if (status >= 300 && status < 400) return 'text-blue-600 bg-blue-50';
  if (status >= 400 && status < 500) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
};

// =============================================================================
// Shared Components
// =============================================================================

const MetricCard = ({ label, value, unit, description, threshold }: {
  label: string;
  value: number | string;
  unit: string;
  description: string;
  threshold?: { good: number; needsWork: number };
}) => {
  let statusColor = "text-gray-600";
  let statusBg = "bg-gray-50";
  let statusLabel = "";
  
  if (threshold && typeof value === "number") {
    if (value <= threshold.good) {
      statusColor = "text-green-600";
      statusBg = "bg-green-50";
      statusLabel = "Good";
    } else if (value <= threshold.needsWork) {
      statusColor = "text-amber-600";
      statusBg = "bg-amber-50";
      statusLabel = "Needs Work";
    } else {
      statusColor = "text-red-600";
      statusBg = "bg-red-50";
      statusLabel = "Poor";
    }
  }

  return (
    <div className={`${statusBg} rounded-xl p-5 border border-gray-100`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </div>
        {statusLabel && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor} bg-white`}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold ${statusColor}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
        <span className="text-lg ml-1 font-normal text-gray-400">{unit}</span>
      </div>
      <div className="text-sm font-medium text-gray-700 mt-2">{description}</div>
    </div>
  );
};

const DEVICE_COLORS = {
  desktop: '#6366f1', // indigo
  mobile: '#22c55e',  // green
  tablet: '#f59e0b',  // amber
  unknown: '#94a3b8', // slate
};

const DeviceBreakdownCard = ({ data }: { data: PerformanceData["deviceBreakdown"] }) => {
  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mobile": return <FiSmartphone className="w-4 h-4" />;
      case "tablet": return <FiTablet className="w-4 h-4" />;
      default: return <FiMonitor className="w-4 h-4" />;
    }
  };

  const totalSessions = data.reduce((sum, d) => sum + Number(d.sessions || 0), 0);
  
  const chartData = data.map(device => ({
    name: device.device_type || 'unknown',
    value: Number(device.sessions) || 0,
    color: DEVICE_COLORS[device.device_type?.toLowerCase() as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown,
  }));

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm break-inside-avoid">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiMonitor className="w-5 h-5 text-indigo-600" />
        Traffic by Device
      </h3>
      
      {data.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-8">No device data available</div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-1 space-y-2">
            {data.map((device) => {
              const sessionCount = Number(device.sessions) || 0;
              const percentage = totalSessions > 0 ? ((sessionCount / totalSessions) * 100).toFixed(1) : '0';
              const color = DEVICE_COLORS[device.device_type?.toLowerCase() as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown;
              
              return (
                <div key={device.device_type} className="flex items-center gap-3 text-sm">
                  <div className="p-1.5 bg-gray-50 rounded text-gray-600">
                    {getDeviceIcon(device.device_type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">{device.device_type || "Unknown"}</div>
                  </div>
                  <div className="font-bold" style={{ color }}>
                    {percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Network Components
// =============================================================================

const NetworkHealthScoreBanner = ({ data }: { data: NetworkHealthData['overview'] }) => {
  const config = getHealthConfig(data.healthScore);
  
  return (
    <div className={`${config.bgClass} rounded-xl p-6 mb-6 text-white shadow-sm flex items-center justify-between`}>
      <div>
        <div className="text-white/80 text-sm mb-1 flex items-center gap-2">
          <FiWifi className="w-4 h-4" />
          Network Health Status
        </div>
        <div className="text-3xl font-bold flex items-center gap-3">
          {config.icon}
          {config.label}
        </div>
      </div>
      <div className="text-right">
        <div className="text-4xl font-bold">{data.errorRate.toFixed(1)}%</div>
        <div className="text-white/80 text-sm">Error Rate</div>
      </div>
    </div>
  );
};

const FailingEndpointsList = ({ data }: { data: NetworkHealthData['topFailingEndpoints'] }) => {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm break-inside-avoid">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiAlertTriangle className="w-5 h-5 text-amber-600" />
        Top Failing Endpoints
      </h3>
      
      <div className="space-y-3">
        {data.slice(0, 5).map((endpoint, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-xl text-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <span className="font-mono text-gray-700 truncate flex-1" title={endpoint.url}>
                  {endpoint.url}
                </span>
                <span className="font-bold text-red-600">{endpoint.error_rate.toFixed(1)}% fail</span>
              </div>
              <div className="flex items-center gap-4 pl-1 text-xs text-gray-500">
                 <span>{endpoint.error_count} errors</span>
                 <span>{formatLatency(endpoint.avg_latency)} avg</span>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// Main Wrapper
// =============================================================================

interface ReportPerformanceWrapperProps {
  siteId: string;
  days?: number; // Optional, defaults to 30
}

export function ReportPerformanceWrapper({ siteId, days = 30 }: ReportPerformanceWrapperProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [networkData, setNetworkData] = useState<NetworkHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Performance Data
        const perfPromise = secureApi.performance.metrics({
          siteId,
          days: days, // Use dynamic days
        });

        // Fetch Network Data
        // Dashboard typically defaults to 7 days, but Report covers 30.
        // We stick to 30 days for a comprehensive monthly report.
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days); // Use dynamic days

        const netPromise = secureApi.performance.networkHealth({
          siteId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        const [perf, net] = await Promise.all([perfPromise, netPromise]);
        setData(perf as PerformanceData);
        setNetworkData(net as NetworkHealthData);
      } catch (err) {
        console.error("Failed to load performance data for report", err);
      } finally {
        setLoading(false);
      }
    };

    if (siteId) {
      fetchData();
    }
  }, [siteId, days]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Performance Metrics...</div>;
  if (!data || !networkData) return null;

  return (
    <div className="space-y-8">
      {/* Vitals Section */}
      <section className="break-inside-avoid mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiZap className="w-6 h-6 text-yellow-500" />
            Core Web Vitals
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
            label="LCP (Loading)"
            value={data.overall.avgLcp}
            unit="ms"
            description="Largest Contentful Paint"
            threshold={{ good: 2500, needsWork: 4000 }}
            />
            <MetricCard
            label="CLS (Layout)"
            value={Number(data.overall.avgCls).toFixed(3)}
            unit=""
            description="Cumulative Layout Shift"
            threshold={{ good: 0.1, needsWork: 0.25 }}
            />
            <MetricCard
            label="INP (Response)"
            value={data.overall.avgInp}
            unit="ms"
            description="Interaction to Next Paint"
            threshold={{ good: 200, needsWork: 500 }}
            />
            <MetricCard
            label="FCP (First Paint)"
            value={data.overall.avgFcp}
            unit="ms"
            description="First Contentful Paint"
            threshold={{ good: 1800, needsWork: 3000 }}
            />
        </div>
      </section>

      {/* Network Section */}
      <section className="break-inside-avoid">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiServer className="w-6 h-6 text-indigo-500" />
            Network Performance
        </h2>
        <div className="grid lg:grid-cols-2 gap-6">
            <div>
                 <NetworkHealthScoreBanner data={networkData.overview} />
                 <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-gray-50 rounded-xl text-center">
                         <div className="text-xs text-gray-500 uppercase tracking-wide">Avg Latency</div>
                         <div className="text-2xl font-bold text-gray-900">{formatLatency(networkData.overview.avgLatency)}</div>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-xl text-center">
                         <div className="text-xs text-gray-500 uppercase tracking-wide">P95 Latency</div>
                         <div className="text-2xl font-bold text-amber-600">{formatLatency(networkData.overview.p95Latency)}</div>
                     </div>
                 </div>
            </div>
            <div className="grid gap-6">
                <DeviceBreakdownCard data={data.deviceBreakdown} />
                <FailingEndpointsList data={networkData.topFailingEndpoints} />
            </div>
        </div>
      </section>
    </div>
  );
}
