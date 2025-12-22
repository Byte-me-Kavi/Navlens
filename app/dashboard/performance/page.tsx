"use client";

import React, { useEffect, useState } from "react";
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import { useDateRange } from "@/context/DateRangeContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import DateRangePicker from "@/components/ui/DateRangePicker";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  Line,
  CartesianGrid,
  LineChart,
} from "recharts";
import {
  FiActivity,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiWifi,
  FiAlertTriangle,
  FiXCircle,
  FiClock,
  FiZap,
  FiServer,
  FiGlobe,
  FiArrowDown,
  FiArrowUp,
} from "react-icons/fi";
import { 
  FaChrome, 
  FaFirefoxBrowser, 
  FaSafari, 
  FaEdge, 
  FaInternetExplorer, 
  FaQuestion 
} from "react-icons/fa";
import { FeatureLock } from "@/components/subscription/FeatureLock";

// =============================================================================
// Types
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

const getGrade = (lcp: number): { grade: string; color: string; icon: React.ReactNode } => {
  if (lcp <= 2500) return { grade: "Good", color: "text-green-600", icon: <FiCheckCircle /> };
  if (lcp <= 4000) return { grade: "Needs Work", color: "text-yellow-600", icon: <FiAlertCircle /> };
  return { grade: "Poor", color: "text-red-600", icon: <FiAlertCircle /> };
};

const getHealthConfig = (score: 'healthy' | 'degraded' | 'critical') => {
  switch (score) {
    case 'healthy':
      return {
        bgClass: 'bg-emerald-600',
        icon: <FiCheckCircle className="w-8 h-8" />,
        label: 'Healthy',
        description: 'Network is performing well',
        pulse: 'bg-green-400',
      };
    case 'degraded':
      return {
        bgClass: 'bg-amber-600',
        icon: <FiAlertTriangle className="w-8 h-8" />,
        label: 'Degraded',
        description: 'Some errors detected',
        pulse: 'bg-amber-400',
      };
    case 'critical':
      return {
        bgClass: 'bg-red-600',
        icon: <FiXCircle className="w-8 h-8" />,
        label: 'Critical',
        description: 'High error rate detected',
        pulse: 'bg-red-400',
      };
  }
};

const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatUrl = (url: string): string => {
  try {
    const parsed = new URL(url, 'http://example.com');
    return parsed.pathname + (parsed.search ? '?...' : '');
  } catch {
    return url.length > 50 ? url.slice(0, 50) + '...' : url;
  }
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

const MetricCard = ({ label, value, unit, description, explanation, threshold }: {
  label: string;
  value: number | string;
  unit: string;
  description: string;
  explanation?: string;
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
    <div className={`${statusBg} rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all`}>
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
      {explanation && (
        <div className="text-xs text-gray-500 mt-1 leading-relaxed">{explanation}</div>
      )}
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
      case "mobile": return <FiSmartphone className="w-5 h-5" />;
      case "tablet": return <FiTablet className="w-5 h-5" />;
      default: return <FiMonitor className="w-5 h-5" />;
    }
  };

  const totalSessions = data.reduce((sum, d) => sum + Number(d.sessions || 0), 0);
  
  const chartData = data.map(device => ({
    name: device.device_type || 'unknown',
    value: Number(device.sessions) || 0,
    color: DEVICE_COLORS[device.device_type?.toLowerCase() as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown,
  }));

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiMonitor className="w-5 h-5 text-indigo-600" />
        Traffic by Device
      </h3>
      
      {data.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-8">No device data available</div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Pie Chart */}
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
                <Tooltip 
                  formatter={(value) => [`${(value ?? 0).toLocaleString()} sessions`, 'Sessions']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex-1 space-y-3">
            {data.map((device) => {
              const sessionCount = Number(device.sessions) || 0;
              const percentage = totalSessions > 0 ? ((sessionCount / totalSessions) * 100).toFixed(1) : '0';
              const color = DEVICE_COLORS[device.device_type?.toLowerCase() as keyof typeof DEVICE_COLORS] || DEVICE_COLORS.unknown;
              
              return (
                <div key={device.device_type} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                    {getDeviceIcon(device.device_type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize text-sm">{device.device_type || "Unknown"}</div>
                    <div className="text-xs text-gray-500">{sessionCount.toLocaleString()} sessions</div>
                  </div>
                  <div className="font-bold text-lg" style={{ color }}>
                    {percentage}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Total Sessions */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <div className="text-2xl font-bold text-gray-900">{totalSessions.toLocaleString()}</div>
        <div className="text-sm text-gray-500">Total Sessions</div>
      </div>
    </div>
  );
};

// =============================================================================
// Network Health Components
// =============================================================================

const NetworkHealthScoreBanner = ({ data }: { data: NetworkHealthData['overview'] }) => {
  const config = getHealthConfig(data.healthScore);
  
  return (
    <div className={`${config.bgClass} rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden`}>
      {/* Animated pulse effect */}
      <div className={`absolute top-4 right-4 w-3 h-3 ${config.pulse} rounded-full animate-ping`} />
      <div className={`absolute top-4 right-4 w-3 h-3 ${config.pulse} rounded-full`} />
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-white/80 text-sm mb-1 flex items-center gap-2">
            <FiWifi className="w-4 h-4" />
            Network Health Status
          </div>
          <div className="text-4xl font-bold flex items-center gap-3">
            {config.icon}
            {config.label}
          </div>
          <div className="text-white/80 mt-2">{config.description}</div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-5xl font-bold">{data.errorRate.toFixed(1)}%</div>
          <div className="text-white/80 text-sm">Error Rate</div>
          <div className="text-white/60 text-xs mt-2">
            {data.totalRequests.toLocaleString()} total requests
          </div>
        </div>
      </div>
    </div>
  );
};

const NetworkMetricCard = ({ 
  label, 
  value, 
  icon, 
  color = 'indigo',
  trend,
  subtext 
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'indigo' | 'green' | 'red' | 'amber' | 'purple' | 'blue';
  trend?: 'up' | 'down';
  subtext?: string;
}) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className={`rounded-2xl p-5 border ${colorClasses[color]} transition-all hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-xl bg-white/60">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'down' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'down' ? <FiArrowDown className="w-4 h-4" /> : <FiArrowUp className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium opacity-80 mt-1">{label}</div>
      {subtext && <div className="text-xs opacity-60 mt-1">{subtext}</div>}
    </div>
  );
};

const StatusCodeVisualization = ({ data }: { data: NetworkHealthData['statusCodeDistribution'] }) => {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  
  // Aggregate by category
  const categoryData = [
    { name: 'Success (2xx)', value: data.filter(d => d.category === 'success').reduce((sum, d) => sum + d.count, 0), color: '#22c55e' },
    { name: 'Redirect (3xx)', value: data.filter(d => d.category === 'redirect').reduce((sum, d) => sum + d.count, 0), color: '#6366f1' },
    { name: 'Client Error (4xx)', value: data.filter(d => d.category === 'client_error').reduce((sum, d) => sum + d.count, 0), color: '#f59e0b' },
    { name: 'Server Error (5xx)', value: data.filter(d => d.category === 'server_error').reduce((sum, d) => sum + d.count, 0), color: '#ef4444' },
  ].filter(d => d.value > 0);
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiServer className="w-5 h-5 text-purple-600" />
        Status Code Distribution
      </h3>
      
      {total === 0 ? (
        <div className="text-center py-8 text-gray-500">No request data available</div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Pie Chart */}
          <div className="w-40 h-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${(value ?? 0).toLocaleString()} requests`, 'Count']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex-1 space-y-3">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="flex-1 text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-bold" style={{ color: item.color }}>
                  {item.value.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">
                  ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Total and Top Codes */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Total Requests</div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {data.slice(0, 5).map((item, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(item.status_code)}`}
            >
              {item.status_code}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const LatencyVisualization = ({ data }: { data: NetworkHealthData['overview'] }) => {
  const latencyMetrics = [
    { 
      label: 'P50', 
      fullName: 'Median (50th Percentile)',
      value: data.p50Latency, 
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      explanation: 'Half of all requests complete faster than this. This is your typical user experience.'
    },
    { 
      label: 'P95', 
      fullName: '95th Percentile',
      value: data.p95Latency, 
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      explanation: '95% of requests complete within this time. Slow requests affect 1 in 20 users.'
    },
    { 
      label: 'P99', 
      fullName: '99th Percentile',
      value: data.p99Latency, 
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      explanation: '99% complete within this time. The worst 1% of users experience this delay.'
    },
  ];
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FiClock className="w-5 h-5 text-indigo-600" />
        Response Time Latency
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        How quickly your server responds to user requests. Lower is better.
      </p>
      
      {/* Latency Cards Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {latencyMetrics.map((item) => (
          <div key={item.label} className={`${item.bgColor} rounded-xl p-4 text-center`}>
            <div className={`text-xs font-medium ${item.textColor} uppercase tracking-wide mb-1`}>
              {item.label}
            </div>
            <div className={`text-2xl font-bold ${item.textColor}`}>
              {formatLatency(item.value)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{item.fullName}</div>
          </div>
        ))}
      </div>
      
      {/* Explanations */}
      <div className="space-y-3 mb-6">
        {latencyMetrics.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full ${item.color} mt-1.5 flex-shrink-0`} />
            <div>
              <span className="font-medium text-sm text-gray-700">{item.label}: </span>
              <span className="text-sm text-gray-500">{item.explanation}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Average Latency */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-indigo-600">{formatLatency(data.avgLatency)}</div>
            <div className="text-sm font-medium text-gray-700">Average Latency</div>
            <div className="text-xs text-gray-500 mt-1">The mean response time across all requests</div>
          </div>
          <div className={`px-4 py-2 rounded-xl ${
            data.avgLatency < 200 ? 'bg-green-50 text-green-600' : 
            data.avgLatency < 500 ? 'bg-amber-50 text-amber-600' : 
            'bg-red-50 text-red-600'
          } text-sm font-medium`}>
            {data.avgLatency < 200 ? '✓ Fast' : data.avgLatency < 500 ? '⚠ Moderate' : '✗ Slow'}
          </div>
        </div>
      </div>
    </div>
  );
};

const FailingEndpointsList = ({ data }: { data: NetworkHealthData['topFailingEndpoints'] }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FiAlertTriangle className="w-5 h-5 text-amber-600" />
          Failing Endpoints
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
            <FiCheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-lg font-semibold text-gray-700">All Endpoints Healthy!</div>
          <div className="text-sm text-gray-400 mt-1">No failing endpoints detected in this period</div>
        </div>
      </div>
    );
  }

  // Helper to get failure reason from common error patterns
  const getFailureReason = (url: string, errorRate: number) => {
    if (url.includes('api/') || url.includes('/api')) return 'API endpoint returning errors';
    if (url.includes('.js') || url.includes('.css')) return 'Static asset loading failed';
    if (url.includes('auth') || url.includes('login')) return 'Authentication request failed';
    if (errorRate > 80) return 'Endpoint unavailable or misconfigured';
    if (errorRate > 50) return 'Intermittent failures detected';
    return 'Request errors detected';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FiAlertTriangle className="w-5 h-5 text-amber-600" />
          Top Failing Endpoints
        </h3>
        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
          {data.length} endpoint{data.length !== 1 ? 's' : ''} with issues
        </span>
      </div>
      
      <div className="space-y-4">
        {data.map((endpoint, idx) => {
          const severityColor = endpoint.error_rate > 50 ? 'red' : endpoint.error_rate > 25 ? 'amber' : 'yellow';
          const bgColors = { red: 'bg-red-50 border-red-100', amber: 'bg-amber-50 border-amber-100', yellow: 'bg-yellow-50 border-yellow-100' };
          const textColors = { red: 'text-red-600', amber: 'text-amber-600', yellow: 'text-yellow-600' };
          
          return (
            <div key={idx} className={`${bgColors[severityColor]} p-4 rounded-xl border transition-all hover:shadow-md`}>
              {/* Header Row */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${endpoint.error_rate > 50 ? 'bg-red-100' : 'bg-amber-100'} flex items-center justify-center ${textColors[severityColor]} font-bold text-sm flex-shrink-0`}>
                  {idx + 1}
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getMethodColor(endpoint.method)} flex-shrink-0`}>
                  {endpoint.method}
                </span>
                <div className={`text-lg font-bold ${textColors[severityColor]} ml-auto flex-shrink-0`}>
                  {endpoint.error_rate.toFixed(1)}% fail
                </div>
              </div>
              
              {/* Full URL */}
              <div className="ml-11 mb-3">
                <div className="text-sm font-mono text-gray-700 break-all bg-white/50 p-2 rounded-lg border border-gray-100">
                  {endpoint.url}
                </div>
              </div>
              
              {/* Stats and Reason Row */}
              <div className="flex items-center gap-4 ml-11 flex-wrap">
                <div className="flex items-center gap-2">
                  <FiXCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">{endpoint.error_count} errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{formatLatency(endpoint.avg_latency)} avg</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-500 italic">{getFailureReason(endpoint.url, endpoint.error_rate)}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 ml-11">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${endpoint.error_rate > 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(endpoint.error_rate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PageAlertsList = ({ data }: { data: NetworkHealthData['pageAlerts'] }) => {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiAlertCircle className="w-5 h-5 text-amber-500" />
        Pages Needing Attention
        <span className="ml-auto text-xs font-medium text-amber-800 bg-amber-50 px-3 py-1 rounded-full">
          {data.length} page{data.length !== 1 ? 's' : ''}
        </span>
      </h3>
      <div className="space-y-3">
        {data.map((page, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded-xl ${page.severity === 'critical' ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiGlobe className={`w-4 h-4 ${page.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={page.page_path}>
                  {page.page_path || '/'}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${page.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {page.error_rate.toFixed(1)}% errors
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentErrorsTimeline = ({ data }: { data: NetworkHealthData['recentErrors'] }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FiZap className="w-5 h-5 text-rose-600" />
          Recent Errors
        </h3>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
            <FiCheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-lg font-semibold text-gray-700">No Recent Errors!</div>
          <div className="text-sm text-gray-400 mt-1">All requests completed successfully</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FiZap className="w-5 h-5 text-rose-600" />
          Recent Errors
        </h3>
        <span className="text-xs font-medium text-rose-700 bg-rose-100 px-3 py-1.5 rounded-full">
          {data.length} error{data.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Timeline - uses full available space */}
      <div className="relative space-y-4 flex-1">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-200 via-rose-100 to-transparent" />
        
        {data.map((error, idx) => {
          const is5xx = error.status >= 500;
          
          return (
            <div key={idx} className="relative flex items-start gap-4 pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2 top-2 w-5 h-5 rounded-full flex items-center justify-center ${is5xx ? 'bg-red-500' : 'bg-amber-500'}`}>
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              
              {/* Error card */}
              <div className={`flex-1 p-4 rounded-xl border ${is5xx ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusColor(error.status)}`}>
                    {error.status}
                  </span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getMethodColor(error.method)}`}>
                    {error.method}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatLatency(error.duration_ms)}
                  </span>
                </div>
                <div className="text-sm font-mono text-gray-600 break-all">
                  {error.url}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NetworkTrendChart = ({ data }: { data: NetworkHealthData['trends'] }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FiTrendingUp className="w-5 h-5 text-indigo-600" />
          Network Trends
        </h3>
        <div className="text-center py-12 text-gray-500 text-sm">
          No trend data available yet
        </div>
      </div>
    );
  }

  // Process data for the chart
  const chartData = data.slice(-24).map((point) => ({
    ...point,
    time: point.time_bucket?.split(' ')[0] || '',
    requests: point.total_requests,
    errorRate: parseFloat(point.error_rate.toFixed(2)),
    latency: point.avg_latency,
  }));

  const totalRequests = chartData.reduce((sum, d) => sum + d.requests, 0);
  const avgErrorRate = chartData.reduce((sum, d) => sum + d.errorRate, 0) / chartData.length;
  const avgLatency = chartData.reduce((sum, d) => sum + d.latency, 0) / chartData.length;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiTrendingUp className="w-5 h-5 text-indigo-600" />
        Network Request Trends
        <div className="ml-auto flex items-center gap-4 text-xs font-normal">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-indigo-500 rounded-sm"></span>
            Requests
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
            Error Rate
          </span>
        </div>
      </h3>
      
      {/* Recharts Area + Line Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value, name) => {
                const v = value ?? 0;
                if (name === 'requests') return [`${Number(v).toLocaleString()} requests`, 'Requests'];
                if (name === 'errorRate') return [`${v}%`, 'Error Rate'];
                return [v, String(name)];
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="requests"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRequests)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="errorRate"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-indigo-50 rounded-xl">
          <div className="text-xl font-bold text-indigo-600">
            {totalRequests.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Requests</div>
        </div>
        <div className="p-3 bg-rose-50 rounded-xl">
          <div className="text-xl font-bold text-rose-600">
            {avgErrorRate.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500">Avg Error Rate</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-xl">
          <div className="text-xl font-bold text-purple-600">
            {formatLatency(avgLatency)}
          </div>
          <div className="text-xs text-gray-500">Avg Latency</div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function PerformanceDashboard() {
  const { selectedSiteId, sites, sitesLoading } = useSite();
  const { dateRange, formatForApi } = useDateRange();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [networkData, setNetworkData] = useState<NetworkHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'vitals' | 'network'>('vitals');

  useEffect(() => {
    if (!selectedSiteId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = formatForApi();
        
        // Fetch both in parallel
        const [perfResult, networkResult] = await Promise.all([
          secureApi.performance.metrics({
            siteId: selectedSiteId,
            startDate,
            endDate,
          }) as Promise<PerformanceData>,
          secureApi.performance.networkHealth({
            siteId: selectedSiteId,
            startDate,
            endDate,
          }) as Promise<NetworkHealthData>,
        ]);
        
        // Parse performance data
        const parsed = {
          ...perfResult,
          overall: {
            avgLcp: Number((perfResult as PerformanceData).overall?.avgLcp) || 0,
            avgCls: (perfResult as PerformanceData).overall?.avgCls || "0",
            avgInp: Number((perfResult as PerformanceData).overall?.avgInp) || 0,
            avgFcp: Number((perfResult as PerformanceData).overall?.avgFcp) || 0,
            avgTtfb: Number((perfResult as PerformanceData).overall?.avgTtfb) || 0,
            totalSessions: Number((perfResult as PerformanceData).overall?.totalSessions) || 0,
          },
          deviceBreakdown: ((perfResult as PerformanceData).deviceBreakdown || []).map((d: Record<string, unknown>) => ({
            ...d,
            sessions: Number(d.sessions) || 0,
            total_events: Number(d.total_events) || 0,
            avg_lcp: Number(d.avg_lcp) || 0,
          })),
        };
        
        setData(parsed as PerformanceData);
        setNetworkData(networkResult);
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
        featureName="Performance Metrics"
        description="View Core Web Vitals and network health insights for your site."
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
    <FeatureLock 
      feature="performance_metrics" 
      title="Unlock Performance Metrics" 
      description="Unlock Core Web Vitals and Network Health monitoring to optimize your site performance."
    >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <FiActivity className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          </div>
          <p className="text-gray-600 text-base">
            Core Web Vitals and network monitoring insights
          </p>
        </div>
        <DateRangePicker />
      </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm flex gap-2">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`flex-1 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'vitals'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiActivity className="w-4 h-4" />
            Web Vitals
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`flex-1 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'network'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiWifi className="w-4 h-4" />
            Network Health
            {networkData && networkData.overview.errorRate > 5 && (
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>

          {/* Web Vitals Tab */}
          {activeTab === 'vitals' && (
            <>
              {/* Performance Grade Banner */}
              <div className="bg-indigo-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-indigo-100 text-sm mb-1">Overall Performance</div>
                    <div className="text-4xl font-bold flex items-center gap-3">
                      {grade.icon}
                      {grade.grade}
                    </div>
                    <div className="text-indigo-200 mt-2">
                      Based on {overall.totalSessions.toLocaleString()} sessions
                    </div>
                  </div>
                  <div className="text-right">
                    <FiTrendingUp className="w-16 h-16 text-indigo-300/50" />
                  </div>
                </div>
              </div>

              {/* Core Web Vitals Cards */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Core Web Vitals</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard
                  label="LCP"
                  value={overall.avgLcp}
                  unit="ms"
                  description="Largest Contentful Paint"
                  explanation="How long it takes your main content to appear. Aim for under 2.5 seconds - users expect fast loading!"
                  threshold={{ good: 2500, needsWork: 4000 }}
                />
                <MetricCard
                  label="CLS"
                  value={parseFloat(overall.avgCls)}
                  unit=""
                  description="Cumulative Layout Shift"
                  explanation="How much your page elements move while loading. Lower is better - unexpected shifts frustrate users."
                  threshold={{ good: 0.1, needsWork: 0.25 }}
                />
                <MetricCard
                  label="INP"
                  value={overall.avgInp}
                  unit="ms"
                  description="Interaction to Next Paint"
                  explanation="How quickly your page responds to clicks and taps. Under 200ms feels instant to users."
                  threshold={{ good: 200, needsWork: 500 }}
                />
                <MetricCard
                  label="FCP"
                  value={overall.avgFcp}
                  unit="ms"
                  description="First Contentful Paint"
                  explanation="When users first see something render on screen. Faster means they know the page is loading."
                  threshold={{ good: 1800, needsWork: 3000 }}
                />
                <MetricCard
                  label="TTFB"
                  value={overall.avgTtfb}
                  unit="ms"
                  description="Time to First Byte"
                  explanation="How fast your server responds. A slow TTFB delays everything else from loading."
                  threshold={{ good: 800, needsWork: 1800 }}
                />
              </div>
              </div>

              {/* Device & Browser Breakdown */}
              <div className="grid md:grid-cols-2 gap-6">
                <DeviceBreakdownCard data={data?.deviceBreakdown || []} />

                {/* Browser Breakdown with PieChart */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FiGlobe className="w-5 h-5 text-indigo-600" />
                    Traffic by Browser
                  </h3>
                  
                  {(!data?.browserBreakdown || data.browserBreakdown.length === 0) ? (
                    <div className="text-gray-500 text-sm text-center py-8">No browser data available</div>
                  ) : (() => {
                    const getBrowserIcon = (browser: string) => {
                      switch (browser?.toLowerCase()) {
                        case 'chrome': return <FaChrome className="w-5 h-5" />;
                        case 'firefox': return <FaFirefoxBrowser className="w-5 h-5" />;
                        case 'safari': return <FaSafari className="w-5 h-5" />;
                        case 'edge': return <FaEdge className="w-5 h-5" />;
                        case 'ie': return <FaInternetExplorer className="w-5 h-5" />;
                        default: return <FaQuestion className="w-5 h-5" />;
                      }
                    };
                    
                    const totalBrowserSessions = data.browserBreakdown.reduce((sum, b) => sum + Number(b.sessions || 0), 0);
                    
                    // Purple/Blue/Cyan gradient colors like the reference image
                    const PIE_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#22d3d8', '#a78bfa'];
                    
                    const chartData = data.browserBreakdown.map((browser, index) => ({
                      name: browser.browser || 'Unknown',
                      value: Number(browser.sessions) || 0,
                      percentage: totalBrowserSessions > 0 
                        ? parseFloat(((Number(browser.sessions) / totalBrowserSessions) * 100).toFixed(1)) 
                        : 0,
                      color: PIE_COLORS[index % PIE_COLORS.length],
                    })).sort((a, b) => b.value - a.value);
                    
                    return (
                      <div className="flex items-center gap-6">
                        {/* Pie Chart */}
                        <div className="w-40 h-40 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value) => [`${(value ?? 0).toLocaleString()} sessions`, 'Sessions']}
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        {/* Browser List with Icons */}
                        <div className="flex-1 space-y-2">
                          {chartData.map((browser) => (
                            <div key={browser.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: browser.color }}
                              />
                              <div className="text-gray-600">
                                {getBrowserIcon(browser.name)}
                              </div>
                              <span className="flex-1 text-sm font-medium">{browser.name}</span>
                              <span className="text-xs text-gray-500">{browser.value.toLocaleString()}</span>
                              <span 
                                className="font-bold text-sm min-w-[50px] text-right"
                                style={{ color: browser.color }}
                              >
                                {browser.percentage}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Total */}
                  {data?.browserBreakdown && data.browserBreakdown.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {data.browserBreakdown.reduce((sum, b) => sum + Number(b.sessions || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">Total Sessions</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Network Health Tab */}
          {activeTab === 'network' && networkData && (
            <>
              {/* Network Health Score Banner */}
              <NetworkHealthScoreBanner data={networkData.overview} />

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <NetworkMetricCard
                  label="Total Requests"
                  value={networkData.overview.totalRequests.toLocaleString()}
                  icon={<FiServer className="w-5 h-5" />}
                  color="indigo"
                />
                <NetworkMetricCard
                  label="4xx Errors"
                  value={networkData.overview.clientErrors.toLocaleString()}
                  icon={<FiAlertTriangle className="w-5 h-5" />}
                  color="amber"
                />
                <NetworkMetricCard
                  label="5xx Errors"
                  value={networkData.overview.serverErrors.toLocaleString()}
                  icon={<FiXCircle className="w-5 h-5" />}
                  color="red"
                />
                <NetworkMetricCard
                  label="Success Rate"
                  value={`${(100 - networkData.overview.errorRate).toFixed(1)}%`}
                  icon={<FiCheckCircle className="w-5 h-5" />}
                  color="green"
                />
              </div>

              {/* Network Trends Chart */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <NetworkTrendChart data={networkData.trends} />
              </div>

              {/* Page Alerts (if any) */}
              {networkData.pageAlerts.length > 0 && (
                <div className="mb-6">
                  <PageAlertsList data={networkData.pageAlerts} />
                </div>
              )}

              {/* Row 1: Status Code Distribution + Response Time Latency */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <StatusCodeVisualization data={networkData.statusCodeDistribution} />
                <LatencyVisualization data={networkData.overview} />
              </div>

              {/* Row 2: Recent Errors + Failing Endpoints */}
              <div className="grid md:grid-cols-2 gap-6">
                <RecentErrorsTimeline data={networkData.recentErrors} />
                <FailingEndpointsList data={networkData.topFailingEndpoints} />
              </div>
            </>
          )}

        {/* Network Health Empty State */}
        {activeTab === 'network' && !networkData && (
          <div className="text-center py-16">
            <FiWifi className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No Network Data Available</h3>
            <p className="text-gray-500 mt-2">
              Network requests will appear here once the tracker starts collecting data.
            </p>
          </div>
        )}

        {/* Note */}
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
          <p className="text-sm text-indigo-800">
            <strong>Note:</strong> {activeTab === 'vitals' 
              ? 'Performance metrics are collected from users with the tracking script installed.'
              : 'Network health data is collected from XHR/Fetch requests monitored by the tracker.'}
          </p>
        </div>
      </div>
    </FeatureLock>
  );
}
