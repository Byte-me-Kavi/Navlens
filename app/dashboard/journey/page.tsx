"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSite } from "@/app/context/SiteContext";
import { useDateRange } from "@/context/DateRangeContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import DateRangePicker from "@/components/ui/DateRangePicker";
import {
  FiArrowRight,
  FiLogIn,
  FiLogOut,
  FiMap,
  FiTrendingUp,
  FiGitMerge,
} from "react-icons/fi";

// Dynamic import for Sankey to avoid SSR issues with D3
const SankeyDiagram = dynamic(() => import("@/components/SankeyDiagram").then(m => ({ default: m.SankeyDiagram })), { 
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-xl" />
});

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
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

// Page list component
const PageList = ({ 
  pages, 
  title, 
  icon, 
  color 
}: { 
  pages: PageCount[]; 
  title: string; 
  icon: React.ReactNode;
  color: string;
}) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
    <h3 className={`text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2`}>
      <span className={color}>{icon}</span>
      {title}
    </h3>
    <div className="space-y-2">
      {pages.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-4">No data available</div>
      ) : (
        pages.map((page, i) => (
          <div 
            key={page.page} 
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
              <span className="text-sm font-medium text-gray-900 truncate max-w-[180px]" title={page.page}>
                {formatPath(page.page)}
              </span>
            </div>
            <span className={`text-sm font-semibold ${color.replace("text-", "text-")}`}>
              {page.count}
            </span>
          </div>
        ))
      )}
    </div>
  </div>
);

// Path card component
const PathCard = ({ journey, rank }: { journey: JourneyPath; rank: number }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full">
          #{rank}
        </span>
        <span className="text-sm text-gray-500">
          {journey.count} sessions
        </span>
      </div>
      <span className="text-xs text-gray-500">
        Avg: {formatDuration(journey.avgDuration)}
      </span>
    </div>
    <div className="flex flex-wrap items-center gap-1">
      {journey.path.map((page, i) => (
        <React.Fragment key={i}>
          <span 
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium truncate max-w-[120px]"
            title={page}
          >
            {formatPath(page)}
          </span>
          {i < journey.path.length - 1 && (
            <FiArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

export default function JourneyDashboard() {
  const { selectedSiteId, sites, sitesLoading } = useSite();
  const { dateRange, formatForApi } = useDateRange();
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSiteId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = formatForApi();
        const response = await fetch("/api/user-journeys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId: selectedSiteId,
            startDate,
            endDate,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch journey data:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiMap className="w-6 h-6 text-blue-600" />
              User Journeys
            </h1>
            <p className="text-gray-600 mt-1">
              Analyze how users navigate through your site
            </p>
          </div>
          <DateRangePicker />
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-indigo-100 text-sm mb-1">Total Multi-Page Sessions</div>
              <div className="text-4xl font-bold">
                {(data?.totalSessions || 0).toLocaleString()}
              </div>
              <div className="text-indigo-200 mt-2">
                Sessions with 2+ page views analyzed
              </div>
            </div>
            <div className="text-right">
              <FiTrendingUp className="w-16 h-16 text-indigo-300/50" />
            </div>
          </div>
        </div>

        {/* Entry/Exit Pages */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <PageList
            pages={data?.entryPages || []}
            title="Top Entry Pages"
            icon={<FiLogIn className="w-4 h-4" />}
            color="text-green-600"
          />
          <PageList
            pages={data?.exitPages || []}
            title="Top Exit Pages"
            icon={<FiLogOut className="w-4 h-4" />}
            color="text-red-600"
          />
        </div>

        {/* Top Paths */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FiArrowRight className="w-5 h-5 text-blue-600" />
            Most Common User Paths
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {(!data?.topPaths || data.topPaths.length === 0) ? (
              <div className="col-span-2 bg-white rounded-xl p-8 text-center border border-gray-100">
                <FiMap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Path Data Yet</h3>
                <p className="text-gray-600">
                  User journeys will appear here once visitors navigate through multiple pages on your site.
                </p>
              </div>
            ) : (
              data.topPaths.slice(0, 10).map((journey, i) => (
                <PathCard key={i} journey={journey} rank={i + 1} />
              ))
            )}
          </div>
        </div>

        {/* Top Transitions (Sankey Preview) */}
        {data?.sankeyLinks && data.sankeyLinks.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiArrowRight className="w-4 h-4 text-blue-600" />
              Top Page Transitions
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.sankeyLinks.slice(0, 20).map((link, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                >
                  <span 
                    className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium truncate max-w-[150px]"
                    title={link.source}
                  >
                    {formatPath(link.source)}
                  </span>
                  <FiArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span 
                    className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded font-medium truncate max-w-[150px]"
                    title={link.target}
                  >
                    {formatPath(link.target)}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-gray-700">
                    {link.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sankey Flow Diagram */}
        {data?.sankeyLinks && data.sankeyLinks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiGitMerge className="w-5 h-5 text-purple-600" />
              User Flow Visualization
            </h2>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <SankeyDiagram links={data.sankeyLinks} width={800} height={400} />
            </div>
          </div>
        )}

        {/* Note when no Sankey data */}
        {(!data?.sankeyLinks || data.sankeyLinks.length === 0) && (
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl text-center">
            <p className="text-sm text-purple-800">
              <strong>Note:</strong> Sankey diagram will appear once sufficient user journey data is collected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
