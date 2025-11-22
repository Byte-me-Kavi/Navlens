/**
 * HeatmapViewer Component
 *
 * Main component that orchestrates heatmap visualization with modular architecture
 */

"use client";

import { useSnapshot } from "@/features/dom-snapshot/hooks/useSnapshot";
import { useHeatmapData } from "@/features/heatmap/hooks/useHeatmapData";
import { useElementClicks } from "@/features/element-tracking/hooks/useElementClicks";
import { SnapshotViewer } from "./SnapshotViewer";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";

export interface HeatmapViewerProps {
  siteId: string;
  pagePath: string;
  deviceType: "desktop" | "tablet" | "mobile";
  dataType: "clicks" | "heatmap" | "both";
  showElements?: boolean;
  showHeatmap?: boolean;
}

export function HeatmapViewer({
  siteId,
  pagePath,
  deviceType,
  dataType,
  showElements = true,
  showHeatmap = true,
}: HeatmapViewerProps) {
  // Fetch snapshot data
  const {
    data: snapshotData,
    loading: snapshotLoading,
    error: snapshotError,
  } = useSnapshot({ siteId, pagePath, deviceType });

  // Fetch heatmap data
  const { data: heatmapData, loading: heatmapLoading } = useHeatmapData({
    siteId,
    pagePath,
    deviceType,
  });

  // Fetch element clicks
  const { data: elementClicks, loading: elementLoading } = useElementClicks({
    siteId,
    pagePath,
    deviceType,
  });

  // Show loading state - wait for snapshot AND initial data attempts
  if (snapshotLoading || heatmapLoading || elementLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading visualization data...</p>
        </div>
      </div>
    );
  }

  // Debug snapshot data
  console.log("🔍 [HEATMAP-VIEWER] Snapshot check:", {
    snapshotError,
    snapshotData,
    hasSnapshot: !!snapshotData,
    snapshotKeys: snapshotData ? Object.keys(snapshotData) : [],
  });

  // Show error state ONLY after ALL loading is complete and no snapshot
  if (snapshotError || !snapshotData || !snapshotData.snapshot) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Snapshot
          </h3>
          <p className="text-gray-600 mb-4">
            {snapshotError?.message ||
              "Snapshot data not available for this page"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Only render after snapshot data is loaded (already checked above)
  // Render the snapshot viewer with all data
  const heatmapPointsToPass =
    showHeatmap && (dataType === "heatmap" || dataType === "both")
      ? heatmapData
      : [];

  const elementClicksToPass =
    showElements && (dataType === "clicks" || dataType === "both")
      ? elementClicks
      : [];

  console.log("📤 HeatmapViewer passing to SnapshotViewer:");
  console.log(
    "  - Heatmap:",
    heatmapData?.length ?? 0,
    "points, showHeatmap:",
    showHeatmap,
    "dataType:",
    dataType,
    "→ willPass:",
    heatmapPointsToPass.length
  );
  console.log(
    "  - Elements:",
    elementClicks?.length ?? 0,
    "clicks, showElements:",
    showElements,
    "dataType:",
    dataType,
    "→ willPass:",
    elementClicksToPass.length
  );

  return (
    <SnapshotViewer
      snapshot={snapshotData!}
      heatmapPoints={heatmapPointsToPass}
      elementClicks={elementClicksToPass}
      siteId={siteId}
      pagePath={pagePath}
      deviceType={deviceType}
    />
  );
}
