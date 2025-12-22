/**
 * DeviceStatsBar Component
 *
 * Modern stats sidebar for heatmap viewer with indigo theme
 */

"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
} from "@heroicons/react/24/outline";

interface DeviceStatsBarProps {
  deviceType: "desktop" | "mobile" | "tablet";
  heatmapPointsCount: number;
  elementClicksCount: number;
  contentWidth: number;
  contentHeight: number;
  viewportWidth: string;
  isOpen?: boolean;
  onOpenChange?: () => void;
  onClose?: () => void;
  // New props for more useful data
  pagePath?: string;
  uniqueSessions?: number;
  avgTimeOnPage?: number;
  topClickedElement?: string;
}

export function DeviceStatsBar({
  deviceType,
  heatmapPointsCount,
  elementClicksCount,
  contentWidth,
  contentHeight,
  viewportWidth,
  isOpen: externalIsOpen,
  onOpenChange,
  onClose,
  pagePath = "/",
  uniqueSessions = 0,
  avgTimeOnPage = 0,
  topClickedElement = "",
}: DeviceStatsBarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  const handleClose = onClose || (() => setInternalOpen(false));

  const totalClicks = heatmapPointsCount + elementClicksCount;
  const avgClicksPerSession = uniqueSessions > 0 ? Math.round(totalClicks / uniqueSessions) : 0;

  // Format time in minutes:seconds
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const DeviceIcon = deviceType === "mobile" 
    ? DevicePhoneMobileIcon 
    : deviceType === "tablet" 
    ? DeviceTabletIcon 
    : ComputerDesktopIcon;

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-72 bg-white border-l border-gray-200 shadow-xl z-[9997] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <DeviceIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white capitalize">
                {deviceType} Stats
              </h3>
              <p className="text-xs text-indigo-200">{viewportWidth}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close stats"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Total Clicks - Hero Stat */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Total Clicks</span>
            <CursorArrowRaysIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-indigo-900">{totalClicks.toLocaleString()}</p>
          <p className="text-xs text-indigo-600 mt-1">on this page</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Heatmap Points */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-xs font-medium text-rose-700">Heatmap</span>
            </div>
            <p className="text-xl font-bold text-rose-900">{heatmapPointsCount.toLocaleString()}</p>
          </div>

          {/* Element Clicks */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Elements</span>
            </div>
            <p className="text-xl font-bold text-emerald-900">{elementClicksCount.toLocaleString()}</p>
          </div>

          {/* Sessions */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <UserGroupIcon className="w-3 h-3 text-sky-600" />
              <span className="text-xs font-medium text-sky-700">Sessions</span>
            </div>
            <p className="text-xl font-bold text-sky-900">{uniqueSessions > 0 ? uniqueSessions.toLocaleString() : '—'}</p>
          </div>

          {/* Avg Clicks/Session */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowTrendingUpIcon className="w-3 h-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Clicks/Sess</span>
            </div>
            <p className="text-xl font-bold text-amber-900">{avgClicksPerSession > 0 ? avgClicksPerSession : '—'}</p>
          </div>
        </div>

        {/* Page Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            Page Details
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Path</span>
              <span className="text-xs font-medium text-gray-900 truncate max-w-[140px]" title={pagePath}>{pagePath}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Size</span>
              <span className="text-xs font-medium text-gray-900">{contentWidth} × {contentHeight}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Device</span>
              <span className="text-xs font-medium text-gray-900 capitalize">{deviceType}</span>
            </div>
            {avgTimeOnPage > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  Avg Time
                </span>
                <span className="text-xs font-medium text-gray-900">{formatTime(avgTimeOnPage)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Clicked Element */}
        {topClickedElement && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
              🔥 Most Clicked
            </h4>
            <p className="text-sm font-medium text-indigo-900 truncate" title={topClickedElement}>
              {topClickedElement}
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gray-100 rounded-xl p-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            💡 <span className="font-medium">Tip:</span> Click on any element overlay to see detailed click analytics for that specific element.
          </p>
        </div>
      </div>
    </div>
  );
}
