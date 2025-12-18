/**
 * DeviceStatsBar Component
 *
 * Compact stats sidebar for heatmap viewer
 */

"use client";

import { useState } from "react";

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
  const handleClose = onClose || (() => setInternalOpen(false));

  const totalClicks = heatmapPointsCount + elementClicksCount;

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-64 bg-white border-l border-gray-200 shadow-lg z-[999] overflow-y-auto">
      <div className="p-3 space-y-3">
        {/* Header with close button */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">{deviceType === "mobile" ? "📱" : "📲"}</span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {deviceType === "mobile" ? "Mobile" : "Tablet"}
              </h3>
              <p className="text-[10px] text-gray-500">{viewportWidth}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close stats"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Click Stats - Compact Cards */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Analytics</h4>
          
          {/* Total Clicks */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-600 font-medium">Total Clicks</p>
                <p className="text-xl font-bold text-blue-700">{totalClicks}</p>
              </div>
              <span className="text-2xl opacity-50">🖱️</span>
            </div>
          </div>

          {/* Heatmap + Element Clicks in Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-2">
              <p className="text-[10px] text-orange-600 font-medium mb-0.5">Heatmap</p>
              <p className="text-lg font-bold text-orange-700">{heatmapPointsCount}</p>
              <span className="text-xl opacity-50">🔥</span>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-2">
              <p className="text-[10px] text-green-600 font-medium mb-0.5">Elements</p>
              <p className="text-lg font-bold text-green-700">{elementClicksCount}</p>
              <span className="text-xl opacity-50">🎯</span>
            </div>
          </div>
        </div>

        {/* Page Info - Compact */}
        {contentWidth > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Page Info</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Size:</span>
                <span className="font-semibold text-gray-900">{contentWidth} × {contentHeight}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Device:</span>
                <span className="font-semibold text-gray-900 capitalize">{deviceType}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
