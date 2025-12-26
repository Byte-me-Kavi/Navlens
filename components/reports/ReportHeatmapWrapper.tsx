"use client";

import React from 'react';
import { HeatmapViewer } from '@/features/heatmap/components/HeatmapViewer';

interface ReportHeatmapWrapperProps {
  siteId: string;
  pagePath: string;
  dataType?: "clicks" | "scrolls" | "hover" | "cursor-paths" | "elements";
  deviceType?: "desktop" | "tablet" | "mobile";
  days: number;
  shareToken?: string;
}

export function ReportHeatmapWrapper({ siteId, pagePath, dataType = "clicks", deviceType = "desktop", days, shareToken }: ReportHeatmapWrapperProps) {
  // Determine display flags based on type
  const showElements = dataType === "elements";
  // Always show heatmap unless we are in elements mode (where we show only elements)
  const showHeatmap = dataType !== "elements";

  // EXACT SAME STRUCTURE AS DASHBOARD:
  // Dashboard uses: <div class="h-screen flex flex-col"> ... <div class="flex-1 relative overflow-hidden">
  // We replicate this with a fixed height outer container + flex layout
  return (
    <div className="h-[700px] flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Main Content - exact same classes as dashboard */}
      <div className="flex-1 relative overflow-hidden">
        <HeatmapViewer 
          siteId={siteId}
          pagePath={pagePath} 
          deviceType={deviceType}
          dataType={dataType}
          showElements={showElements}
          showHeatmap={showHeatmap}
          showAllViewports={false}
          userDevice="desktop"
          showExportButton={false}
          days={days}
          shareToken={shareToken}
        />
      </div>
    </div>
  );
}
