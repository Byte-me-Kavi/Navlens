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
  ExclamationTriangleIcon,
  PlayIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import LoadingSpinner from "@/components/LoadingSpinner";
import { secureApi } from "@/lib/secureApi";
import { useAI } from "@/context/AIProvider";

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
  topPages?: { path: string; visits: number }[];
  weeklyActivity?: { date: string; clicks: number }[];
  // New Metrics
  liveUsers?: number;
  frustration?: { rageClicks: number; deadClicks: number; errors: number };
  recentSessions?: { id: string; country: string; duration: string; device: string; status: 'frustrated' | 'smooth' | 'bounced' }[];
  deviceStats?: { device: string; count: number }[];
  webVitals?: { lcp: number; cls: number };
}

// ... existing code ...



// ... existing code ...



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
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      trend: { value: 0, isPositive: true }, // Add trend if you have it
    },
    {
      name: "Total Clicks",
      value: data.stats.totalClicks.value,
      icon: CursorArrowRaysIcon,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      trend: data.stats.totalClicks.trend,
    },
    {
      name: "Active Sessions (24h)",
      value: data.stats.activeSessions.value,
      icon: EyeIcon,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      trend: data.stats.activeSessions.trend,
    },
    {
      name: "Heatmaps Generated",
      value: data.stats.totalHeatmaps.value,
      icon: SparklesIcon,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      trend: data.stats.totalHeatmaps.trend,
    },
  ];
}

const DashboardClient: React.FC = () => {
  const { openChat } = useAI();

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

  // Handle AI insights for dashboard
  const handleAIInsights = () => {
    openChat('dashboard', {
      stats: data,
      timestamp: new Date().toISOString(),
    });
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
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Welcome to Navlens Analytics
                </h1>
                <p className="text-gray-600 text-base">
                  Transform your website analytics with intelligent heatmap
                  tracking
                </p>
              </div>
              <div className="shrink-0 flex gap-2">
                <button
                  onClick={handleAIInsights}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <SparklesIcon className="w-4 h-4" />
                  AI Insights
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-6 py-2.5 bg-white text-indigo-700 border border-indigo-200 text-sm rounded-xl hover:bg-indigo-50 transition-all font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5"
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
                className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1"
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
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* NEW: Live & Alert Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Now Widget */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-medium text-gray-600">Live Now</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-3">
                {data?.liveUsers || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Users online (5 min)</p>
            </div>

            {/* Frustration Alert Widget */}
            <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
              (data?.frustration?.rageClicks || 0) > 0 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-white border-gray-100'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <ExclamationTriangleIcon className={`w-5 h-5 ${
                  (data?.frustration?.rageClicks || 0) > 0 ? 'text-amber-600' : 'text-gray-400'
                }`} />
                <span className="text-sm font-medium text-gray-700">Frustration (Today)</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data?.frustration?.rageClicks || 0}</p>
                  <p className="text-xs text-gray-500">Rage Clicks</p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data?.frustration?.deadClicks || 0}</p>
                  <p className="text-xs text-gray-500">Dead Clicks</p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{data?.frustration?.errors || 0}</p>
                  <p className="text-xs text-gray-500">JS Errors</p>
                </div>
              </div>
              {(data?.frustration?.rageClicks || 0) > 0 && (
                <Link 
                  href="/dashboard/sessions?filter=frustrated" 
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  <PlayIcon className="w-3 h-3" /> Watch Sessions
                </Link>
              )}
            </div>

            {/* Device Breakdown Widget - Pie Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3">
                <DevicePhoneMobileIcon className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Device Split (7d)</span>
              </div>
              <div className="flex items-center gap-4">
                {data?.deviceStats && data.deviceStats.length > 0 ? (
                  <>
                    {/* Pie Chart */}
                    <div className="relative w-24 h-24 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.deviceStats.map(d => ({
                              name: d.device,
                              value: d.count
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {data.deviceStats.map((entry, index) => {
                              // Color palette: Indigo (Desktop), Purple (Mobile), Sky (Tablet)
                              const deviceColors: Record<string, string> = {
                                desktop: '#6366f1', // Indigo
                                mobile: '#a855f7',  // Purple
                                tablet: '#0ea5e9',  // Sky
                              };
                              const deviceKey = entry.device.toLowerCase();
                              const color = deviceColors[deviceKey] || '#9ca3af'; // Gray fallback
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={color} 
                                />
                              );
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-2">
                      {data.deviceStats.map((device) => {
                        const total = data.deviceStats?.reduce((sum, d) => sum + d.count, 0) || 1;
                        const percentage = Math.round((device.count / total) * 100);
                        // Match pie chart colors
                        const deviceKey = device.device.toLowerCase();
                        const colorClasses: Record<string, string> = {
                          desktop: 'bg-indigo-500',
                          mobile: 'bg-purple-500',
                          tablet: 'bg-sky-500',
                        };
                        const bgColor = colorClasses[deviceKey] || 'bg-gray-400';
                        return (
                          <div key={device.device} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${bgColor}`} />
                              <span className="text-gray-600">{device.device}</span>
                            </div>
                            <span className="font-semibold text-gray-700">{percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 py-4">No device data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* NEW: Recent Sessions Feed */}
          {data?.recentSessions && data.recentSessions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Recent Sessions</h3>
                <Link href="/dashboard/sessions" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentSessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        session.status === 'frustrated' ? 'bg-red-100 text-red-600' :
                        session.status === 'bounced' ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {session.status === 'frustrated' ? '😤' : session.status === 'bounced' ? '🚪' : '😊'}
                      </div>
                      <div>
                        <p className="text-xs font-mono text-gray-600 truncate max-w-[120px]">
                          {session.id.slice(0, 8)}...
                        </p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <span>{session.device}</span> • <span>{session.duration}</span>
                        </p>
                      </div>
                    </div>
                    <Link 
                      href={`/dashboard/sessions/${session.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
                    >
                      <PlayIcon className="w-3 h-3" /> Play
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weekly Activity Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  Click Activity
                </h3>
              </div>
              <div className="h-64 mt-4">
                {data?.weeklyActivity ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weeklyActivity} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: '#f3f4f6', radius: 8 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                        formatter={(value: any) => [`${value} clicks`, '']}
                      />
                      <Bar 
                        dataKey="clicks" 
                        fill="#6366f1" 
                        radius={[6, 6, 0, 0]}
                        animationDuration={1500}
                      >
                         {
                            data.weeklyActivity.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#6366f1" />
                            ))
                         }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                   /* Skeleton Loading State */
                   <div className="flex items-end justify-between h-full gap-2 px-2">
                     {[1, 2, 3, 4, 5, 6, 7].map((_, idx) => (
                       <div key={idx} className="flex-1 flex flex-col justify-end gap-2 h-full">
                         <div className="w-full bg-gray-100 rounded-t-lg animate-pulse" style={{ height: `${30 + (idx * 10)}%` }} />
                       </div>
                     ))}
                   </div>
                )}
              </div>
            </div>

            {/* Top Pages */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <FireIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-900">Top Pages (Last 7 Days)</h3>
              </div>
              <div className="flex items-center gap-6 h-48">
                {data?.topPages && data.topPages.length > 0 ? (
                  <>
                    {/* Donut Chart with Recharts */}
                    <div className="relative w-40 h-40 shrink-0">
                      {/* Center Text (Total) */}
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                         <span className="text-xs text-gray-400 font-medium">Total</span>
                         <span className="text-xl font-bold text-gray-900">
                           {data.topPages!.reduce((sum, p) => sum + p.visits, 0).toLocaleString()}
                         </span>
                      </div>

                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(() => {
                              const sorted = [...data.topPages!].sort((a, b) => b.visits - a.visits);
                              const top4 = sorted.slice(0, 4);
                              const others = sorted.slice(4);
                              const othersCount = others.reduce((sum, p) => sum + p.visits, 0);
                              
                              const chartData = top4.map(p => ({
                                name: p.path,
                                value: p.visits
                              }));
                              
                              if (othersCount > 0) {
                                chartData.push({ name: "Others", value: othersCount });
                              }
                              return chartData;
                            })()}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {/* Colors: Indigo, Purple, Blue, Sky, Gray(Others) */}
                            {[
                              "#4f46e5", // Indigo-600
                              "#a855f7", // Purple-500 
                              "#3b82f6", // Blue-500
                              "#0ea5e9", // Sky-500
                              "#9ca3af"  // Gray-400 (Others)
                            ].map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             itemStyle={{ color: '#3730a3', fontWeight: 600, fontSize: '12px' }}
                             formatter={(value: any) => [`${value} visits`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      

                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-40 pr-2 custom-scrollbar">
                       {(() => {
                          const total = data.topPages!.reduce((sum, page) => sum + page.visits, 0);
                          const sorted = [...data.topPages!].sort((a, b) => b.visits - a.visits);
                          const top4 = sorted.slice(0, 4);
                          const othersCount = sorted.slice(4).reduce((sum, p) => sum + p.visits, 0);
                          
                          const displayItems = top4.map(p => ({ ...p, color: "" })); // Colors assigned by index matching chart
                          if (othersCount > 0) {
                            displayItems.push({ path: "Others", visits: othersCount, color: "bg-gray-400" });
                          }

                          const bgColors = [
                            "bg-indigo-600",
                            "bg-purple-500",
                            "bg-blue-500", 
                            "bg-sky-500",
                            "bg-gray-400"
                          ];
                         
                         return displayItems.map((item, i) => (
                           <div key={item.path} className="flex items-center justify-between text-xs group cursor-default">
                             <div className="flex items-center gap-2 min-w-0">
                               <div className={`w-2.5 h-2.5 rounded-full ${bgColors[i % bgColors.length]}`} />
                               <span className="font-medium text-gray-700 truncate max-w-[100px]" title={item.path}>
                                 {item.path}
                               </span>
                             </div>
                             <div className="flex items-center gap-2 text-gray-500">
                                <span className="font-semibold text-gray-700">{Math.round((item.visits / total) * 100)}%</span>
                                <span className="text-gray-400 text-[10px]">({item.visits})</span>
                             </div>
                           </div>
                         ));
                       })()}
                    </div>
                  </>
                ) : (
                  <div className="w-full text-center py-12 text-gray-400 text-sm">
                    No page views recorded yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Getting Started Section */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Getting Started
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all duration-300 group">
                <div className="shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-indigo-200 shadow-md group-hover:scale-110 transition-transform">
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

              <div className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all duration-300 group">
                <div className="shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-indigo-200 shadow-md group-hover:scale-110 transition-transform">
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

              <div className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all duration-300 group">
                <div className="shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-indigo-200 shadow-md group-hover:scale-110 transition-transform">
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
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-lg font-bold mb-1">Add Your First Site</h3>
              <p className="text-indigo-100 mb-3 text-sm">
                Start tracking user behavior in minutes
              </p>
              <Link
                href="/dashboard/my-sites"
                className="bg-white text-indigo-600 px-6 py-2 text-sm rounded-xl font-bold hover:bg-indigo-50 transition-colors inline-block shadow-sm"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Documentation
              </h3>
              <p className="text-gray-600 mb-3 text-sm">
                Learn how to make the most of Navlens
              </p>
              <Link
                href="/docs"
                className="bg-gray-100 text-gray-700 px-6 py-2 text-sm rounded-xl font-bold hover:bg-gray-200 transition-colors inline-block"
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
