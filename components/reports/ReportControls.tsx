"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { CalendarDaysIcon, ChevronDownIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

const DATE_RANGES = [
  { value: 7, label: "Last 7 days" },
  { value: 15, label: "Last 15 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
] as const;

// Report sections that can be toggled
const REPORT_SECTIONS = [
  { key: "summary", label: "Executive Summary", default: true },
  { key: "network", label: "Health & Speed Audit", default: true },
  { key: "heatmaps_clicks", label: "Click Heatmaps", default: true },
  { key: "heatmaps_scrolls", label: "Scroll Heatmaps", default: true },
  { key: "heatmaps_elements", label: "Smart Elements", default: true },
  { key: "frustration", label: "Frustration Signals", default: true },
  { key: "journey", label: "User Journeys", default: true },
  { key: "forms", label: "Form Analytics", default: true },
  { key: "traffic", label: "Traffic Overview", default: true },
  { key: "mobile_audit", label: "Mobile Usability Audit", default: true },
  { key: "experiments", label: "A/B Experiments", default: true },
  { key: "sessions", label: "Session Spotlights", default: true },
  { key: "cohorts", label: "User Cohorts", default: true },
  { key: "feedback", label: "User Feedback", default: true },
] as const;

interface ReportControlsProps {
  currentDays: number;
}

export function ReportControls({ currentDays }: ReportControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const sectionsDropdownRef = useRef<HTMLDivElement>(null);

  // Parse current include from URL
  const includeStr = searchParams.get("include") || "all";
  const currentIncludes = new Set(
    includeStr === "all" ? REPORT_SECTIONS.map(s => s.key) : includeStr.split(",")
  );

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateOpen(false);
      }
      if (sectionsDropdownRef.current && !sectionsDropdownRef.current.contains(event.target as Node)) {
        setIsSectionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRangeChange = (days: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", days.toString());
    router.push(`?${params.toString()}`);
    setIsDateOpen(false);
  };

  const handleToggleSection = (key: string) => {
    const newIncludes = new Set(currentIncludes);
    if (newIncludes.has(key)) {
      newIncludes.delete(key);
    } else {
      newIncludes.add(key);
    }
    
    const params = new URLSearchParams(searchParams.toString());
    
    // If all sections are selected, use "all", otherwise list them
    if (newIncludes.size === REPORT_SECTIONS.length) {
      params.delete("include");
    } else {
      params.set("include", Array.from(newIncludes).join(","));
    }
    
    router.push(`?${params.toString()}`);
  };

  const handleSelectAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("include");
    router.push(`?${params.toString()}`);
  };

  const handleDeselectAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("include", "summary"); // Keep at least summary
    router.push(`?${params.toString()}`);
  };

  const currentLabel = DATE_RANGES.find((r) => r.value === currentDays)?.label || `Last ${currentDays} days`;
  const selectedCount = currentIncludes.size;

  return (
    <div className="flex items-center gap-2 no-print">
      {/* Date Range Selector */}
      <div className="relative" ref={dateDropdownRef}>
        <button
          onClick={() => setIsDateOpen(!isDateOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
          <span>{currentLabel}</span>
          <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${isDateOpen ? "rotate-180" : ""}`} />
        </button>

        {isDateOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => handleRangeChange(range.value)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                  currentDays === range.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections Selector */}
      <div className="relative" ref={sectionsDropdownRef}>
        <button
          onClick={() => setIsSectionsOpen(!isSectionsOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-500" />
          <span>Sections ({selectedCount})</span>
          <ChevronDownIcon className={`w-3 h-3 text-gray-400 transition-transform ${isSectionsOpen ? "rotate-180" : ""}`} />
        </button>

        {isSectionsOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
            {/* Quick Actions */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between text-xs">
              <button onClick={handleSelectAll} className="text-indigo-600 hover:underline font-medium">Select All</button>
              <button onClick={handleDeselectAll} className="text-gray-500 hover:underline">Deselect All</button>
            </div>
            
            {/* Section Checkboxes */}
            {REPORT_SECTIONS.map((section) => (
              <label
                key={section.key}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={currentIncludes.has(section.key)}
                  onChange={() => handleToggleSection(section.key)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className={currentIncludes.has(section.key) ? "text-gray-900 font-medium" : "text-gray-500"}>
                  {section.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
