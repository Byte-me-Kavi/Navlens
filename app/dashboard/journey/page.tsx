"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import { useDateRange } from "@/context/DateRangeContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import { FeatureLock } from '@/components/subscription/FeatureLock';
import {
  FiArrowRight,
  FiLogIn,
  FiLogOut,
  FiMap,
  FiTrendingUp,
  FiGitMerge,
  FiClock,
} from "react-icons/fi";


// Dynamic import for Sankey to avoid SSR issues with D3/Recharts
const SankeyDiagram = dynamic(
  () => import("@/components/SankeyDiagram").then((mod) => mod.SankeyDiagram),
  { 
    ssr: false,
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-xl" />
  }
);

interface PathNode {
  source: string;
  target: string;
  value: number;
}

interface JourneyPath {
  path: string[];
  count: number;
  avgDuration: number;
}

interface PageCount {
  page: string;
  count: number;
}

interface JourneyData {
  sankeyLinks: PathNode[];
  topPaths: JourneyPath[];
  entryPages: PageCount[];
  exitPages: PageCount[];
  totalSessions: number;
}

// Format path for display
const formatPath = (path: string): string => {
  if (path === "/" || path === "") return "Homepage";
  if (path.length > 25) return "..." + path.slice(-22);
  return path;
};

// Format duration
const formatDuration = (seconds: number): string => {
  if (seconds === 0) return "< 1s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

// Palette for unique colors
const PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', full: 'bg-blue-50 text-blue-700 border-blue-200', hex: '#3b82f6' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', full: 'bg-indigo-50 text-indigo-700 border-indigo-200', hex: '#6366f1' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', full: 'bg-purple-50 text-purple-700 border-purple-200', hex: '#a855f7' },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', full: 'bg-pink-50 text-pink-700 border-pink-200', hex: '#ec4899' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', full: 'bg-rose-50 text-rose-700 border-rose-200', hex: '#f43f5e' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', full: 'bg-orange-50 text-orange-700 border-orange-200', hex: '#f97316' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', full: 'bg-amber-50 text-amber-700 border-amber-200', hex: '#d97706' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', full: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', full: 'bg-teal-50 text-teal-700 border-teal-200', hex: '#14b8a6' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', full: 'bg-cyan-50 text-cyan-700 border-cyan-200', hex: '#06b6d4' },
  { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', full: 'bg-sky-50 text-sky-700 border-sky-200', hex: '#0ea5e9' },
  { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', full: 'bg-violet-50 text-violet-700 border-violet-200', hex: '#8b5cf6' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', full: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', hex: '#d946ef' },
  { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', full: 'bg-lime-50 text-lime-700 border-lime-200', hex: '#84cc16' },
  { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', full: 'bg-red-50 text-red-700 border-red-200', hex: '#ef4444' },
  { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', full: 'bg-yellow-50 text-yellow-700 border-yellow-200', hex: '#eab308' },
];

const _HOMEPAGE_COLOR = PALETTE[0]; // Blue for homepage

// Page list component
const PageList = ({ 
  pages, 
  title, 
  icon, 
  color: headerColor,
  getPathColor
}: { 
  pages: { page: string; count: number }[],
  title: string,
  icon: React.ReactNode,
  color: string,
  getPathColor: (p: string) => typeof PALETTE[0]
}) => {
  // Helper for pill color based on rank
  const getBgColor = () => {
    if (headerColor.includes("red")) return "bg-red-50 text-red-700";
    if (headerColor.includes("green")) return "bg-green-50 text-green-700";
    if (headerColor.includes("indigo")) return "bg-indigo-50 text-indigo-700";
    return "bg-gray-50 text-gray-700";
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl ${headerColor.replace("text-", "bg-").replace("600", "50")}`}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-5 h-5 ${headerColor}` })}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      
      <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
        {pages.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">No data available</div>
        ) : (
          pages.map((page, i) => {
            const pageName = page.page || "/";
            const pathColor = getPathColor(pageName);
            return (
              <div 
                key={page.page} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center ${pathColor.bg} ${pathColor.text}`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm font-medium truncate max-w-[200px] ${pathColor.text}`} title={page.page}>
                    {formatPath(page.page)}
                  </span>
                </div>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${getBgColor()}`}>
                  {page.count.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Path card component
const PathCard = ({ journey, rank, getPathColor }: { journey: JourneyPath; rank: number; getPathColor: (p: string) => typeof PALETTE[0] }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-sm bg-gray-100 text-gray-700 font-bold w-8 h-8 rounded-xl flex items-center justify-center">
          {rank}
        </span>
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {journey.count.toLocaleString()} sessions
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
             <FiClock className="w-3 h-3" />
             Avg: {formatDuration(journey.avgDuration)}
          </div>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {journey.path.map((page, i) => {
        const color = getPathColor(page);
        return (
          <React.Fragment key={i}>
            <span 
              className={`text-xs px-3 py-1.5 rounded-lg font-medium truncate max-w-[140px] border ${color.full}`}
              title={page}
            >
              {formatPath(page)}
            </span>
            {i < journey.path.length - 1 && (
              <FiArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

export default function JourneyDashboard() {
  const { selectedSiteId, sites, sitesLoading } = useSite();
  const { dateRange: _dateRange, formatForApi: _formatForApi } = useDateRange();
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");

  const sankeyRef = React.useRef<HTMLDivElement>(null);

  // Unique color generation for the current dataset
  const getPathColor = useMemo(() => {
    const colorMap = new Map<string, typeof PALETTE[0]>();
    const usedColors = new Set<string>();
    
    // Always assign blue to homepage
    colorMap.set('/', PALETTE[0]);
    colorMap.set('', PALETTE[0]);
    usedColors.add(PALETTE[0].hex);

    // Collect all unique paths from data
    const allPaths = new Set<string>();
    
    data?.topPaths?.forEach(p => p.path.forEach(step => allPaths.add(step)));
    data?.entryPages?.forEach(p => allPaths.add(p.page));
    data?.exitPages?.forEach(p => allPaths.add(p.page));
    data?.sankeyLinks?.forEach(l => {
        allPaths.add(l.source.includes('__') ? l.source.split('__')[1] : l.source);
        allPaths.add(l.target.includes('__') ? l.target.split('__')[1] : l.target);
    });

    // Assign colors
    let paletteIndex = 1; // Start after Blue
    Array.from(allPaths).sort().forEach(path => {
      if (path === '/' || path === '') return;
      
      // Cycle through palette if we run out (rare with large palette)
      const color = PALETTE[paletteIndex % PALETTE.length];
      colorMap.set(path, color);
      paletteIndex++;
    });

    return (path: string) => {
        if (!path) return PALETTE[0];
        // Clean path if it has prefix
        const cleanPath = path.includes('__') ? path.split('__')[1] : path;
        return colorMap.get(cleanPath) || colorMap.get('/') || PALETTE[0];
    };
  }, [data]);

  useEffect(() => {
    if (!selectedSiteId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Calculate dates based on local timeRange selection
        const now = new Date();
        const end = new Date(now);
        const start = new Date(now);

        switch (timeRange) {
            case "24h":
                start.setHours(start.getHours() - 24);
                break;
            case "7d":
                start.setDate(start.getDate() - 7);
                break;
            case "30d":
                start.setDate(start.getDate() - 30);
                break;
            case "90d":
                start.setDate(start.getDate() - 90);
                break;
            default:
                start.setHours(start.getHours() - 24);
        }

        const startDate = start.toISOString();
        const endDate = end.toISOString();

        console.log('[JourneyDashboard] Fetching with:', { siteId: selectedSiteId, startDate, endDate, timeRange });
        
        const result = await secureApi.journeys.get({
          siteId: selectedSiteId,
          startDate,
          endDate,
        });

        console.log('[JourneyDashboard] API response:', result);
        setData(result as JourneyData);
      } catch (error) {
        console.error("Failed to fetch journey data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSiteId, timeRange]); // Removed dateRange checks to use local selector


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
        featureName="user journeys"
        description="Visualize how users navigate through your site."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Analyzing user journeys..." />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-1">
      <div className="max-w-7xl mx-auto">
        <FeatureLock 
            feature="user_journeys" 
            title="User Journey Analysis" 
            description="Visualize how users navigate through your site with interactive flow diagrams."
        >
            {/* Header Area */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                    <FiMap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Journeys</h1>
                    <p className="text-gray-500">Analyze how users navigate through your site</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 3 Months</option>
                </select>
            </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Multi-Page Sessions */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl">
                            <FiTrendingUp className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">
                                {data?.totalSessions ? data.totalSessions.toLocaleString() : '0'}
                            </div>
                            <div className="text-sm text-gray-500">Multi-Page Sessions</div>
                        </div>
                    </div>
                </div>

                {/* Entry Points Count */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <FiLogIn className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">
                                {data?.entryPages ? data.entryPages.length.toLocaleString() : '0'}
                            </div>
                            <div className="text-sm text-gray-500">Unique Entry Points</div>
                        </div>
                    </div>
                </div>

                {/* Exit Points Count */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-xl">
                            <FiLogOut className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-900">
                                {data?.exitPages ? data.exitPages.length.toLocaleString() : '0'}
                            </div>
                            <div className="text-sm text-gray-500">Unique Exit Points</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Entry/Exit Detail Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Entry Points List (Top 5) */}
                <PageList 
                    pages={data?.entryPages || []}
                    title="Top Entry Pages"
                    icon={<FiLogIn className="w-5 h-5" />}
                    color="text-emerald-600"
                    getPathColor={getPathColor}
                />

                {/* Exit Points List (Top 5) */}
                <PageList 
                    pages={data?.exitPages || []}
                    title="Top Exit Pages"
                    icon={<FiLogOut className="w-5 h-5" />}
                    color="text-red-600"
                    getPathColor={getPathColor}
                />
            </div>

            {/* Sankey Flow Diagram */}
            {data?.sankeyLinks && data.sankeyLinks.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-xl">
                      <FiGitMerge className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">User Flow Visualization</h2>
                  </div>

                </div>
                <div 
                    ref={sankeyRef}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm overflow-x-auto min-h-[500px]"
                >
                  <SankeyDiagram 
                    links={data.sankeyLinks} 
                    width={1000} 
                    height={500} 
                    getColor={(name) => getPathColor(name).hex}
                   />
                </div>
              </div>
            )}

            {/* Note when no Sankey data */}
            {(!data?.sankeyLinks || data.sankeyLinks.length === 0) && (
              <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                <p className="text-sm text-indigo-800">
                  <strong>Note:</strong> Sankey diagram will appear once sufficient user journey data is collected.
                </p>
              </div>
            )}

            {/* Top Paths */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <FiArrowRight className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Most Common User Paths</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {(!data?.topPaths || data.topPaths.length === 0) ? (
                  <div className="col-span-2 bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                      <FiMap className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Path Data Yet</h3>
                    <p className="text-gray-500">
                      User journeys will appear here once visitors navigate through multiple pages on your site.
                    </p>
                  </div>
                ) : (
                  data.topPaths.slice(0, 10).map((journey, i) => (
                    <PathCard key={i} journey={journey} rank={i + 1} getPathColor={getPathColor} />
                  ))
                )}
              </div>
            </div>

            {/* Top Transitions */}
            {data?.sankeyLinks && data.sankeyLinks.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 rounded-xl">
                    <FiArrowRight className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Top Page Transitions</h3>
                  <span className="ml-auto text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full">
                    {data.sankeyLinks.length} transitions
                  </span>
                </div>
                <div className="space-y-3">
                  {data.sankeyLinks.slice(0, 15).map((link, i) => {
                    const sourceName = link.source.includes('__') ? link.source.split('__')[1] : link.source;
                    const targetName = link.target.includes('__') ? link.target.split('__')[1] : link.target;
                    const sourceColor = getPathColor(sourceName);
                    const targetColor = getPathColor(targetName);
                    
                    return (
                      <div 
                        key={i} 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-xs font-bold w-6 h-6 bg-gray-200 text-gray-600 rounded-lg flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span 
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium truncate max-w-[160px] ${sourceColor.bg} ${sourceColor.text}`}
                          title={sourceName}
                        >
                          {formatPath(sourceName)}
                        </span>
                        <FiArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <span 
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium truncate max-w-[160px] ${targetColor.bg} ${targetColor.text}`}
                          title={targetName}
                        >
                          {formatPath(targetName)}
                        </span>
                        <span className="ml-auto text-sm font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {link.value.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Note when no Sankey data */}
            {(!data?.sankeyLinks || data.sankeyLinks.length === 0) && (
              <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                <p className="text-sm text-indigo-800">
                  <strong>Note:</strong> Sankey diagram will appear once sufficient user journey data is collected.
                </p>
              </div>
            )}
        </FeatureLock>
      </div>
    </div>
  );
}
