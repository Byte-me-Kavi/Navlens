"use client";

import React, { useState, useRef, useEffect } from "react";
import { ReportHeatmapWrapper } from "./ReportHeatmapWrapper";
import { 
  CursorArrowRippleIcon, 
  ArrowTrendingDownIcon, 
  EyeIcon, 
  ArrowsPointingOutIcon, 
  ViewfinderCircleIcon,
  ChevronDownIcon,
  FireIcon
} from "@heroicons/react/24/outline";

// Data type configuration for the dropdown
const DATA_TYPES = [
  { value: "clicks", label: "Click Heatmap", icon: CursorArrowRippleIcon },
  { value: "scrolls", label: "Scroll Heatmap", icon: ArrowTrendingDownIcon },
  { value: "hover", label: "Hover Heatmap", icon: EyeIcon },
  { value: "cursor-paths", label: "Cursor Paths", icon: ArrowsPointingOutIcon },
  { value: "elements", label: "Smart Elements", icon: ViewfinderCircleIcon },
] as const;

interface ReportHeatmapSectionProps {
  siteId: string;
  uniquePaths: string[];
  days: number;
}

// Sub-component for individual heatmap sections to manage independent state
function ReportHeatmapItem({ path, index, siteId, days }: { path: string, index: number, siteId: string, days: number }) {
  const [selectedDataType, setSelectedDataType] = useState<
    "clicks" | "scrolls" | "hover" | "cursor-paths" | "elements"
  >("clicks");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentDataType = DATA_TYPES.find(dt => dt.value === selectedDataType);
  const DataTypeIcon = currentDataType?.icon || CursorArrowRippleIcon;

  return (
        <section className="mb-16 break-before-page">
            <div className="flex items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                 <div className="flex items-center gap-4">
                     <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg shadow-sm">3.{index + 1}</span>
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900">
                           The "Fold" & Engagement: {path === '/' ? 'Homepage' : path}
                        </h3>
                        <p className="text-gray-500 text-lg mt-1">Scroll Depth & Attention Analysis</p>
                    </div>
                </div>

                {/* Heatmap Type Selector - Visible on hover/interaction */}
                <div className="relative break-inside-avoid print:hidden" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-4 py-2 hover:bg-indigo-50 transition-colors shadow-sm"
                    >
                      <DataTypeIcon className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-indigo-900">{currentDataType?.label}</span>
                      <ChevronDownIcon className={`w-4 h-4 text-indigo-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[50] min-w-[220px]">
                        {DATA_TYPES.map((type) => {
                          const Icon = type.icon;
                          const isSelected = selectedDataType === type.value;
                          return (
                            <button
                              key={type.value}
                              onClick={() => {
                                setSelectedDataType(type.value);
                                setDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-8 break-inside-avoid">
                 <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <FireIcon className="w-5 h-5" />
                    Engagement Insight: {currentDataType?.label}
                </h4>
                <p className="text-amber-800 text-sm italic">
                    {selectedDataType === 'clicks' && "Visualizing high-intent interactions. Red zones indicate fierce engagement, while cold zones suggest ignored content."}
                    {selectedDataType === 'scrolls' && "Tracking how far users travel down the page. The gradient shift shows exactly where you lose your audience (The 'Fold')."}
                    {selectedDataType === 'hover' && "Revealing user attention and reading patterns. Mouse movement often correlates with eye tracking."}
                    {selectedDataType === 'elements' && "Analyzing interactive elements directly. Identifying broken links, rage clicks, and dead elements."}
                    {selectedDataType === 'cursor-paths' && "Tracing individual user journeys across the screen to understand navigation flow."}
                </p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 overflow-hidden shadow-sm min-h-[600px]">
                <ReportHeatmapWrapper 
                    siteId={siteId} 
                    pagePath={path} 
                    dataType={selectedDataType}
                    days={days}
                />
            </div>
        </section>
  );
}

export function ReportHeatmapSection({ siteId, uniquePaths, days }: ReportHeatmapSectionProps) {
  if (uniquePaths.length === 0) return null;

  return (
    <>
      {uniquePaths.map((path, index) => (
        <ReportHeatmapItem 
          key={path} 
          path={path} 
          index={index} 
          siteId={siteId} 
          days={days}
        />
      ))}
    </>
  );
}
