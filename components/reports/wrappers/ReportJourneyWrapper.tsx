"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { secureApi } from "@/lib/secureApi";
import {
  FiArrowRight,
  FiLogIn,
  FiLogOut,
  FiMap,
  FiClock,
} from "react-icons/fi";

// Dynamic import for Sankey
const SankeyDiagram = dynamic(
  () => import("@/components/SankeyDiagram").then((mod) => mod.SankeyDiagram),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
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

const formatPath = (path: string): string => {
  if (path === "/" || path === "") return "Homepage";
  return path;
};

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return "< 1s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
};

// Simplified Palette
const PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-700', full: 'bg-blue-50 text-blue-700 border-blue-200', hex: '#3b82f6' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', full: 'bg-indigo-50 text-indigo-700 border-indigo-200', hex: '#6366f1' },
  { bg: 'bg-purple-50', text: 'text-purple-700', full: 'bg-purple-50 text-purple-700 border-purple-200', hex: '#a855f7' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', full: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' },
  { bg: 'bg-orange-50', text: 'text-orange-700', full: 'bg-orange-50 text-orange-700 border-orange-200', hex: '#f97316' },
];

export default function ReportJourneyWrapper({ siteId, days }: { siteId: string, days: number }) {
  const [data, setData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  const getPathColor = useMemo(() => {
    // ... existing memo logic
    const colorMap = new Map<string, typeof PALETTE[0]>();
    colorMap.set('/', PALETTE[0]);
    colorMap.set('', PALETTE[0]);

    if (!data) return (p: string) => PALETTE[0];

    // Simple assignment for report
    const allPaths = new Set<string>();
    data.topPaths?.forEach(p => p.path.forEach(step => allPaths.add(step)));
    data.sankeyLinks?.forEach(l => {
         allPaths.add(l.source.includes('__') ? l.source.split('__')[1] : l.source);
         allPaths.add(l.target.includes('__') ? l.target.split('__')[1] : l.target);
    });

    let i = 1;
    Array.from(allPaths).forEach(p => {
        if (p !== '/' && p !== '') {
            colorMap.set(p, PALETTE[i % PALETTE.length]);
            i++;
        }
    });

    return (path: string) => {
        if (!path) return PALETTE[0];
        const cleanPath = path.includes('__') ? path.split('__')[1] : path;
        return colorMap.get(cleanPath) || PALETTE[0];
    };
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      if (!siteId) return;
      setLoading(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days); // Use days prop

        const result = await secureApi.journeys.get({
          siteId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
        setData(result as JourneyData);
      } catch (error) {
        console.error("Failed to fetch journey data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [siteId]);

  if (loading) return <div className="text-gray-500 text-center py-8">Loading Journeys...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
             <div className="p-3 bg-indigo-50 rounded-lg"><FiMap className="text-indigo-600" /></div>
             <div>
                 <div className="text-2xl font-bold">{data.totalSessions.toLocaleString()}</div>
                 <div className="text-xs text-gray-500">Multi-Page Sessions</div>
             </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
             <div className="p-3 bg-emerald-50 rounded-lg"><FiLogIn className="text-emerald-600" /></div>
             <div>
                 <div className="text-2xl font-bold">{data.entryPages.length}</div>
                 <div className="text-xs text-gray-500">Entry Points</div>
             </div>
        </div>
         <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
             <div className="p-3 bg-red-50 rounded-lg"><FiLogOut className="text-red-600" /></div>
             <div>
                 <div className="text-2xl font-bold">{data.exitPages.length}</div>
                 <div className="text-xs text-gray-500">Exit Points</div>
             </div>
        </div>
      </div>

      {/* Sankey */}
      {data.sankeyLinks.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 break-inside-avoid">
             <h3 className="font-bold text-gray-900 mb-4">Top User Flows</h3>
             <div className="h-[400px]">
                <SankeyDiagram 
                    links={data.sankeyLinks} 
                    width={700} // Optimized for A4 Print width
                    height={400} 
                    getColor={(name) => getPathColor(name).hex}
                />
             </div>
          </div>
      )}

      {/* Top Paths List */}
      <div className="break-inside-avoid">
          <h3 className="font-bold text-gray-900 mb-4">Common Paths</h3>
          <div className="space-y-3">
             {data.topPaths.slice(0, 5).map((journey, i) => (
                 <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm">
                          {i + 1}
                      </div>
                      <div className="flex-1 flex flex-wrap gap-2 items-center">
                          {journey.path.map((page, idx) => {
                             const color = getPathColor(page);
                             return (
                                 <React.Fragment key={idx}>
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${color.bg} ${color.text}`}>
                                        {formatPath(page)}
                                    </span>
                                    {idx < journey.path.length - 1 && <FiArrowRight className="text-gray-300 w-3 h-3" />}
                                 </React.Fragment>
                             )
                          })}
                      </div>
                      <div className="text-right text-sm">
                          <div className="font-bold">{journey.count} sessions</div>
                          <div className="text-xs text-gray-500">{formatDuration(journey.avgDuration)}</div>
                      </div>
                 </div>
             ))}
          </div>
      </div>
    </div>
  );
}
