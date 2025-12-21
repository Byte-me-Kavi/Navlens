"use client";

import { useEffect, useState } from "react";
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ServerIcon,
  CircleStackIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

// Helper to format bytes
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function SystemMonitoringPage() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Filtering
  const [selectedPath, setSelectedPath] = useState<string>('all');
  const [availablePaths, setAvailablePaths] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (pathOverride?: string) => {
    const isInitial = !metrics;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const pathParam = pathOverride !== undefined ? pathOverride : selectedPath;
      const metricsUrl = pathParam === 'all' 
        ? "/api/admin/metrics" 
        : `/api/admin/metrics?path=${encodeURIComponent(pathParam)}`;

      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/admin/health"),
        fetch(metricsUrl)
      ]);
      
      const healthData = await healthRes.json();
      const metricsData = await metricsRes.json();
      
      setHealth(healthData);
      setMetrics(metricsData);
      setAvailablePaths(metricsData.paths || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch monitoring data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []); // Run once on mount

  // Refetch when path changes
  useEffect(() => {
    fetchData(selectedPath);
  }, [selectedPath]);

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!health || !metrics) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (metrics.error) {
    return (
        <div className="p-8">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5" />
                <p>Failed to load metrics: {metrics.error}</p>
            </div>
        </div>
    )
  }

  const summary = metrics.summary || { total_reqs: 0, avg_lat: 0, error_rate: 0 };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
           <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
             Last updated: {lastUpdated.toLocaleTimeString()}
             {refreshing && <span className="text-blue-500 text-xs animate-pulse">(Refreshing...)</span>}
           </p>
        </div>
        
        <div className="flex items-center gap-3">
             {/* API Filter Selector */}
            <div className="relative">
                <select 
                    value={selectedPath}
                    onChange={(e) => setSelectedPath(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm font-medium shadow-sm transition-all"
                >
                    <option value="all">All APIs</option>
                    {availablePaths.map(path => (
                        <option key={path} value={path}>{path}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>

            <button 
            onClick={() => fetchData()} 
            disabled={loading || refreshing}
            className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
            title="Refresh Data"
            >
            <ArrowPathIcon className={`w-5 h-5 ${loading || refreshing ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supabase Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CircleStackIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Database (Supabase)</h3>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(health.services.supabase.status)}`}>
              {health.services.supabase.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
             <span className="text-gray-500">Latency</span>
             <span className={`font-mono font-medium ${getLatencyColor(health.services.supabase.latency_ms)}`}>
               {health.services.supabase.latency_ms}ms
             </span>
          </div>
        </div>

        {/* ClickHouse Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <ServerIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Analytics (ClickHouse)</h3>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(health.services.clickhouse.status)}`}>
                {health.services.clickhouse.status}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
             <span className="text-gray-500">Latency</span>
             <span className={`font-mono font-medium ${getLatencyColor(health.services.clickhouse.latency_ms)}`}>
               {health.services.clickhouse.latency_ms}ms
             </span>
          </div>
          {health.services.clickhouse.error && (
            <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded">
                Error: {health.services.clickhouse.error}
            </div>
          )}
        </div>
      </div>

      {/* API Metrics Summary */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Performance (Last 24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                 {parseInt(metrics.summary.total_reqs).toLocaleString()}
              </p>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Avg. Latency</p>
              <p className={`text-3xl font-bold mt-2 ${getLatencyColor(metrics.summary.avg_lat)}`}>
                 {Math.round(metrics.summary.avg_lat)}<span className="text-lg text-gray-400 font-normal">ms</span>
              </p>
           </div>
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Error Rate</p>
              <p className={`text-3xl font-bold mt-2 ${parseFloat(summary.error_rate || '0') > 5 ? 'text-red-600' : 'text-green-600'}`}>
                 {Number.isNaN(parseFloat(summary.error_rate)) ? '0.00' : parseFloat(summary.error_rate).toFixed(2)}%
              </p>
           </div>
        </div>
      </div>

      {/* Infrastructure Usage */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Supabase Users</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
                {health?.services?.supabase?.usage?.row_estimate?.toLocaleString() || '-'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Total Profiles</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Analytics Storage</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
                {formatBytes(health?.services?.clickhouse?.usage?.size_bytes || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Compressed (ClickHouse)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Analytics Rows</p>
            <p className="text-3xl font-bold mt-2 text-gray-900">
                {health?.services?.clickhouse?.usage?.rows?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Total System Events</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <p className="text-sm font-medium text-gray-500">API Calls (Month)</p>
             <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold mt-2 text-blue-600">
                    {health?.services?.clickhouse?.usage?.monthly_requests?.toLocaleString() || '0'}
                </p>
             </div>
             <p className="text-xs text-gray-400 mt-1">Current Billing Cycle</p>
        </div>
      </div>

      {/* Recent Activity Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-700">Live Activity (Last 60 Minutes)</h3>
        </div>
        <div className="p-6">
            <div className="h-64 flex items-end justify-between gap-1">
                {metrics.chart_data.map((point: any, i: number) => {
                    // Simple Bar Chart
                    // Use a minimum height of 4px for 0 values if we want to show the timeline exists, else 0
                    // Actually 0 height is fine for 0 requests, but maybe show a baseline?
                    const maxReqs = Math.max(...metrics.chart_data.map((d: any) => d.total_requests), 10); // Scale based on max
                    const heightPct = (point.total_requests / maxReqs) * 100;
                    
                    return (
                        <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                            {/* Bar */}
                            <div 
                                className={`w-full transition-all duration-500 rounded-t ${point.total_requests > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-100'}`} 
                                style={{ height: `${point.total_requests > 0 ? Math.max(heightPct, 5) : 4}%` }} 
                            >
                                {point.error_requests > 0 && (
                                    <div className="w-full bg-red-500 rounded-t" style={{ height: `${(point.error_requests / point.total_requests) * 100}%` }}></div>
                                )}
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs p-2 rounded hidden group-hover:block whitespace-nowrap z-10 shadow-lg pointer-events-none">
                                <div className="font-bold">{new Date(point.time).toLocaleTimeString()}</div>
                                <div>Requests: {point.total_requests}</div>
                                {point.error_requests > 0 && <div className="text-red-300">Errors: {point.error_requests}</div>}
                                <div className="text-gray-400">{Math.round(point.avg_latency)}ms</div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {/* X-Axis Labels (Simple) */}
            <div className="flex justify-between mt-2 text-xs text-gray-400 px-1">
                <span>60m ago</span>
                <span>30m ago</span>
                <span>Now</span>
            </div>
        </div>
      </div>
    </div>
  );
}
