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
        gradient: 'from-emerald-500 via-green-500 to-teal-500',
        icon: <FiCheckCircle className="w-8 h-8" />,
        label: 'Healthy',
        description: 'Network is performing well',
        pulse: 'bg-green-400',
      };
    case 'degraded':
      return {
        gradient: 'from-amber-500 via-orange-500 to-yellow-500',
        icon: <FiAlertTriangle className="w-8 h-8" />,
        label: 'Degraded',
        description: 'Some errors detected',
        pulse: 'bg-amber-400',
      };
    case 'critical':
      return {
        gradient: 'from-red-500 via-rose-500 to-pink-500',
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

const DeviceBreakdownCard = ({ data }: { data: PerformanceData["deviceBreakdown"] }) => {
  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mobile": return <FiSmartphone className="w-5 h-5" />;
      case "tablet": return <FiTablet className="w-5 h-5" />;
      default: return <FiMonitor className="w-5 h-5" />;
    }
  };

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

// =============================================================================
// Network Health Components
// =============================================================================

const NetworkHealthScoreBanner = ({ data }: { data: NetworkHealthData['overview'] }) => {
  const config = getHealthConfig(data.healthScore);
  
  return (
    <div className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden`}>
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
  color = 'blue',
  trend,
  subtext 
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  trend?: 'up' | 'down';
  subtext?: string;
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color]} transition-all hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-white/50">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'down' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'down' ? <FiArrowDown className="w-4 h-4" /> : <FiArrowUp className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-70 mt-1">{label}</div>
      {subtext && <div className="text-xs opacity-50 mt-1">{subtext}</div>}
    </div>
  );
};

const StatusCodeVisualization = ({ data }: { data: NetworkHealthData['statusCodeDistribution'] }) => {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const successCount = data.filter(d => d.category === 'success').reduce((sum, d) => sum + d.count, 0);
  const errorCount = data.filter(d => d.category === 'client_error' || d.category === 'server_error').reduce((sum, d) => sum + d.count, 0);
  
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiServer className="w-4 h-4 text-purple-600" />
        Status Code Distribution
      </h3>
      
      {/* Visual bar */}
      <div className="h-4 rounded-full bg-gray-100 overflow-hidden flex mb-4">
        {data.map((item, idx) => {
          const width = total > 0 ? (item.count / total) * 100 : 0;
          const colors = {
            success: 'bg-emerald-400',
            redirect: 'bg-blue-400',
            client_error: 'bg-amber-400',
            server_error: 'bg-red-500',
          };
          return (
            <div
              key={idx}
              className={`${colors[item.category]} first:rounded-l-full last:rounded-r-full transition-all hover:brightness-110`}
              style={{ width: `${width}%` }}
              title={`${item.status_code}: ${item.count}`}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          <span className="text-gray-600">2xx Success</span>
          <span className="ml-auto font-semibold text-emerald-600">{successCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-gray-600">Errors</span>
          <span className="ml-auto font-semibold text-red-600">{errorCount.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Top status codes */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500 mb-2">Top Status Codes</div>
        <div className="flex flex-wrap gap-2">
          {data.slice(0, 6).map((item, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(item.status_code)}`}
            >
              {item.status_code} ({item.count.toLocaleString()})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const LatencyVisualization = ({ data }: { data: NetworkHealthData['overview'] }) => {
  const maxLatency = Math.max(data.p99Latency, 1);
  
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiClock className="w-4 h-4 text-indigo-600" />
        Latency Percentiles
      </h3>
      
      <div className="space-y-4">
        {[
          { label: 'P50', value: data.p50Latency, color: 'bg-green-500' },
          { label: 'P95', value: data.p95Latency, color: 'bg-amber-500' },
          { label: 'P99', value: data.p99Latency, color: 'bg-red-500' },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-semibold">{formatLatency(item.value)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                style={{ width: `${(item.value / maxLatency) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <div className="text-3xl font-bold text-indigo-600">{formatLatency(data.avgLatency)}</div>
        <div className="text-sm text-gray-500">Average Latency</div>
      </div>
    </div>
  );
};

const FailingEndpointsList = ({ data }: { data: NetworkHealthData['topFailingEndpoints'] }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FiAlertTriangle className="w-4 h-4 text-amber-600" />
          Failing Endpoints
        </h3>
        <div className="text-center py-8 text-gray-500">
          <FiCheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
          <div className="text-sm">No failing endpoints detected!</div>
          <div className="text-xs text-gray-400 mt-1">All endpoints are healthy</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiAlertTriangle className="w-4 h-4 text-amber-600" />
        Top Failing Endpoints
        <span className="ml-auto text-xs font-normal text-gray-500">{data.length} endpoints</span>
      </h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {data.map((endpoint, idx) => (
          <div key={idx} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMethodColor(endpoint.method)}`}>
                {endpoint.method}
              </span>
              <span className="text-sm font-mono text-gray-700 truncate flex-1" title={endpoint.url}>
                {formatUrl(endpoint.url)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FiXCircle className="w-3 h-3 text-red-500" />
                {endpoint.error_count} errors
              </span>
              <span className="flex items-center gap-1">
                <FiClock className="w-3 h-3" />
                {formatLatency(endpoint.avg_latency)}
              </span>
              <span className={`ml-auto font-semibold ${endpoint.error_rate > 50 ? 'text-red-600' : 'text-amber-600'}`}>
                {endpoint.error_rate.toFixed(1)}% fail rate
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PageAlertsList = ({ data }: { data: NetworkHealthData['pageAlerts'] }) => {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200 shadow-sm">
      <h3 className="text-sm font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <FiAlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
        Pages Needing Attention
      </h3>
      <div className="space-y-2">
        {data.map((page, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded-lg ${page.severity === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiGlobe className={`w-4 h-4 ${page.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />
                <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]" title={page.page_path}>
                  {page.page_path || '/'}
                </span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${page.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
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
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FiZap className="w-4 h-4 text-rose-600" />
          Recent Errors
        </h3>
        <div className="text-center py-8 text-gray-500">
          <FiCheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
          <div className="text-sm">No recent errors!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiZap className="w-4 h-4 text-rose-600" />
        Recent Errors
        <span className="ml-auto text-xs font-normal text-gray-500">Last {data.length}</span>
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {data.slice(0, 10).map((error, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg border border-red-100">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(error.status)}`}>
              {error.status}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getMethodColor(error.method)}`}>
              {error.method}
            </span>
            <span className="text-xs text-gray-600 truncate flex-1" title={error.url}>
              {formatUrl(error.url)}
            </span>
            <span className="text-xs text-gray-400">{formatLatency(error.duration_ms)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const NetworkTrendChart = ({ data }: { data: NetworkHealthData['trends'] }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm col-span-full">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FiTrendingUp className="w-4 h-4 text-blue-600" />
          Network Trends
        </h3>
        <div className="text-center py-8 text-gray-500 text-sm">
          No trend data available yet
        </div>
      </div>
    );
  }

  // Find max values for scaling
  const maxRequests = Math.max(...data.map(d => d.total_requests), 1);
  const maxErrorRate = Math.max(...data.map(d => d.error_rate), 1);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm col-span-full">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FiTrendingUp className="w-4 h-4 text-blue-600" />
        Network Request Trends
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 bg-blue-500 rounded"></span>
            Requests
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 bg-red-500 rounded"></span>
            Error Rate
          </span>
        </div>
      </h3>
      
      {/* Simple visualization bars */}
      <div className="h-40 flex items-end gap-1 border-b border-gray-200 pb-2">
        {data.slice(-24).map((point, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Request bar */}
            <div
              className="w-full bg-blue-400 rounded-t hover:bg-blue-500 transition-colors"
              style={{ height: `${(point.total_requests / maxRequests) * 100}%`, minHeight: '2px' }}
            />
            {/* Error indicator dot */}
            {point.error_rate > 0 && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full border border-white"
                style={{ bottom: `${Math.min((point.error_rate / maxErrorRate) * 50, 100)}%` }}
              />
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {point.total_requests} requests<br />
                {point.error_rate.toFixed(1)}% errors
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{data[0]?.time_bucket?.split(' ')[0]}</span>
        <span>Last 24 periods</span>
        <span>{data[data.length - 1]?.time_bucket?.split(' ')[0]}</span>
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
        featureName="performance metrics"
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
              Core Web Vitals and network monitoring insights
            </p>
          </div>
          <DateRangePicker />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('vitals')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'vitals'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <FiActivity className="w-4 h-4" />
            Web Vitals
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'network'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <FiWifi className="w-4 h-4" />
            Network Health
            {networkData && networkData.overview.errorRate > 5 && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Web Vitals Tab */}
        {activeTab === 'vitals' && (
          <>
            {/* Performance Grade Banner */}
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

            {/* Device & Browser Breakdown */}
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
                color="blue"
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

            {/* Main Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <LatencyVisualization data={networkData.overview} />
              <StatusCodeVisualization data={networkData.statusCodeDistribution} />
              <RecentErrorsTimeline data={networkData.recentErrors} />
            </div>

            {/* Failing Endpoints - Full Width */}
            <FailingEndpointsList data={networkData.topFailingEndpoints} />
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
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> {activeTab === 'vitals' 
              ? 'Performance metrics are collected from users with the tracking script installed.'
              : 'Network health data is collected from XHR/Fetch requests monitored by the tracker.'}
          </p>
        </div>
      </div>
    </div>
  );
}
