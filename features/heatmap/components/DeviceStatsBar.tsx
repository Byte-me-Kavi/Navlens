/**
 * DeviceStatsBar Component
 *
 * Right sidebar showing device statistics for mobile and tablet views
 */

"use client";

import { useState } from "react";

const ChartIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

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
}: DeviceStatsBarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  const handleOpen = onOpenChange || (() => setInternalOpen(true));
  const handleClose = onClose || (() => setInternalOpen(false));

  // Only show when explicitly opened
  const shouldShow = isOpen;

  const totalClicks = heatmapPointsCount + elementClicksCount;

  return (
    <>
      {/* Collapsible Sidebar - Responsive */}
      <div
        className={`fixed right-0 top-0 h-screen transition-all duration-300 ease-in-out bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-2xl z-999 overflow-y-auto rounded-l-xl ${
          shouldShow ? "w-80 sm:w-80 md:w-80" : "w-0"
        }`}
      >
        <div className="p-5 space-y-6">
          {/* Close button - Always visible when sidebar is open */}
          {shouldShow && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Device Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">
                {deviceType === "mobile" ? "📱" : "📲"}
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {deviceType === "mobile" ? "Mobile View" : "Tablet View"}
                </h3>
                <p className="text-xs text-gray-500">Device Statistics</p>
              </div>
            </div>
            <div className="mt-3 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-xs font-medium text-gray-600">
                Viewport: {viewportWidth}
              </span>
            </div>
          </div>

          {/* Click Statistics */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Click Analytics
            </h4>

            {/* Total Clicks */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    Total Clicks
                  </p>
                  <p className="text-3xl font-bold text-blue-700">
                    {totalClicks}
                  </p>
                </div>
                <div className="text-4xl opacity-50">🖱️</div>
              </div>
            </div>

            {/* Heatmap Points */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium mb-1">
                    Heatmap Points
                  </p>
                  <p className="text-2xl font-bold text-orange-700">
                    {heatmapPointsCount}
                  </p>
                </div>
                <div className="text-3xl opacity-50">🔥</div>
              </div>
            </div>

            {/* Element Clicks */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-1">
                    Element Clicks
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {elementClicksCount}
                  </p>
                </div>
                <div className="text-3xl opacity-50">🎯</div>
              </div>
            </div>
          </div>

          {/* Page Dimensions */}
          {contentWidth > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Page Dimensions
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📐</span>
                  <span className="text-xs text-gray-500 font-medium">
                    Content Size
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Width:</span>
                    <span className="font-semibold text-gray-900">
                      {contentWidth}px
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Height:</span>
                    <span className="font-semibold text-gray-900">
                      {contentHeight}px
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Device Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Device Info
            </h4>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 font-medium">Type:</span>
                <span className="font-semibold text-purple-900 capitalize">
                  {deviceType}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 font-medium">Viewport:</span>
                <span className="font-semibold text-purple-900">
                  {viewportWidth}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button - Responsive positioning */}
      {deviceType === "desktop" && !shouldShow && (
        <button
          onClick={handleOpen}
          className="fixed right-6 top-6 z-9999 p-3 bg-linear-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg transition-all hover:shadow-2xl hover:scale-105"
          title="Show Device Stats"
        >
          <ChartIcon />
        </button>
      )}
      {/* Mobile/Tablet Toggle Button */}
      {deviceType !== "desktop" && !shouldShow && (
        <button
          onClick={handleOpen}
          className="fixed right-4 bottom-4 z-9999 p-4 bg-linear-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full shadow-lg transition-all hover:shadow-2xl hover:scale-105"
          title="Show Stats"
        >
          <ChartIcon />
        </button>
      )}
    </>
  );
}
