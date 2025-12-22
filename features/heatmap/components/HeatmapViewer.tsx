/**
 * HeatmapViewer Component
 *
 * Main component that orchestrates heatmap visualization with modular architecture
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSnapshot } from "@/features/dom-snapshot/hooks/useSnapshot";
import { useHeatmapData } from "@/features/heatmap/hooks/useHeatmapData";
import { useElementClicks } from "@/features/element-tracking/hooks/useElementClicks";
import { useScrollHeatmapData } from "@/features/heatmap/hooks/useScrollHeatmapData";
import { useHoverHeatmapData } from "@/features/heatmap/hooks/useHoverHeatmapData";
import { useCursorPathsData } from "@/features/heatmap/hooks/useCursorPathsData";
import { SnapshotViewer } from "./SnapshotViewer";
import { DeviceStatsBar } from "./DeviceStatsBar";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { apiClient } from "@/shared/services/api/client";
import type { HeatmapPoint } from "@/features/heatmap/types/heatmap.types";
import type { ElementClick } from "@/features/element-tracking/types/element.types";

import type { SnapshotData } from "@/features/dom-snapshot/types/snapshot.types";

export interface HeatmapViewerProps {
  siteId: string;
  pagePath: string;
  deviceType: "desktop" | "tablet" | "mobile";
  dataType: "clicks" | "scrolls" | "hover" | "cursor-paths" | "elements";
  showElements?: boolean;
  showHeatmap?: boolean;
  showAllViewports?: boolean;
  onViewportModeChange?: (showAll: boolean) => void;
  userDevice?: "desktop" | "tablet" | "mobile";
  statsBarOpen?: boolean;
  onStatsBarOpenChange?: () => void;
  onStatsBarClose?: () => void;
  onIframeScroll?: (scrollY: number) => void;
}

export function HeatmapViewer({
  siteId,
  pagePath,
  deviceType,
  dataType,
  showElements = true,
  showHeatmap = true,
  showAllViewports: externalShowAllViewports = false,
  onViewportModeChange,
  userDevice = "desktop",
  statsBarOpen = false,
  onStatsBarOpenChange,
  onStatsBarClose,
  onIframeScroll,
}: HeatmapViewerProps) {
  const [showAllViewports, setShowAllViewports] = useState(
    externalShowAllViewports
  );
  const [allViewportsData, setAllViewportsData] = useState<{
    heatmap: HeatmapPoint[];
    elements: ElementClick[];
  } | null>(null);
  
  // Session count for stats bar
  const [uniqueSessions, setUniqueSessions] = useState(0);

  // Fetch snapshot data internally
  const {
    data: snapshotData,
    loading: snapshotLoading,
    error: snapshotError,
  } = useSnapshot({ siteId, pagePath, deviceType });

  // Handler to fetch all viewports data
  const handleShowAllViewports = useCallback(async () => {
    // ... (keep existing handleShowAllViewports logic)
    const newShowAllViewports = !showAllViewports;

    if (!newShowAllViewports) {
      setShowAllViewports(false);
      setAllViewportsData(null);
      onViewportModeChange?.(false);
      return;
    }

    try {
      const [heatmapResponse, elementsResponse] = await Promise.all([
        apiClient.post<{ clicks: HeatmapPoint[] }>(
          "/heatmap-clicks-all-viewports",
          { siteId, pagePath, deviceType }
        ),
        apiClient.post<ElementClick[]>("/element-clicks-all-viewports", {
          siteId, pagePath, deviceType
        }),
      ]);

      setAllViewportsData({
        heatmap: heatmapResponse.clicks || [],
        elements: elementsResponse || [],
      });
      setShowAllViewports(true);
      onViewportModeChange?.(true);
    } catch (error) {
      console.error("Error fetching all viewports data:", error);
      alert("Failed to load data for all viewports. Please try again.");
    }
  }, [
    showAllViewports,
    setShowAllViewports,
    setAllViewportsData,
    onViewportModeChange,
    siteId,
    pagePath,
    deviceType,
  ]);

  // Sync external prop changes
  useEffect(() => {
    if (externalShowAllViewports !== showAllViewports) {
      handleShowAllViewports();
    }
  }, [externalShowAllViewports, handleShowAllViewports, showAllViewports]);

  // Fetch unique session count for this page
  useEffect(() => {
    const fetchSessionCount = async () => {
      try {
        const response = await apiClient.post<{ sessions: number }>('/page-sessions', {
          siteId,
          pagePath,
          deviceType
        });
        setUniqueSessions(response.sessions || 0);
      } catch (error) {
        // Fallback: estimate from heatmap data if API fails
        console.log('[HeatmapViewer] Could not fetch session count, using estimate');
        // Will be updated when heatmap data loads
      }
    };
    
    if (siteId && pagePath) {
      fetchSessionCount();
    }
  }, [siteId, pagePath, deviceType]);

  // Extract viewport dimensions from snapshot
  // The snapshot HTML contains viewport dimensions from when it was captured
  const getViewportDimensions = () => {
    if (!snapshotData?.snapshot) return { width: 0, height: 0 };

    // Parse snapshot HTML to extract viewport meta or use default
    const parser = new DOMParser();
    const doc = parser.parseFromString(snapshotData.snapshot, "text/html");
    const html = doc.documentElement;

    // Try to get from data attributes first (if tracker set them)
    const width = parseInt(html.getAttribute("data-viewport-width") || "0");
    const height = parseInt(html.getAttribute("data-viewport-height") || "0");

    // Fallback to common desktop viewport if not found
    return {
      width: width || 1920,
      height: height || 1080,
    };
  };

  const { width: documentWidth, height: documentHeight } =
    getViewportDimensions();

  // Only fetch filtered data when NOT showing all viewports
  // When showing all viewports, data comes from handleShowAllViewports
  const shouldFetchFiltered =
    !showAllViewports && documentWidth > 0 && documentHeight > 0;

  // Fetch heatmap data with viewport filtering
  const heatmapParams = useMemo(
    () => ({
      siteId,
      pagePath,
      deviceType,
      documentWidth: shouldFetchFiltered ? documentWidth : 1920,
      documentHeight: shouldFetchFiltered ? documentHeight : 1080,
    }),
    [
      siteId,
      pagePath,
      deviceType,
      shouldFetchFiltered,
      documentWidth,
      documentHeight,
    ]
  );

  const { data: heatmapData, loading: heatmapLoading } =
    useHeatmapData(heatmapParams);

  // Fetch element clicks with viewport filtering
  const elementParams = useMemo(
    () => ({
      siteId,
      pagePath,
      deviceType,
      documentWidth: shouldFetchFiltered ? documentWidth : 1920,
      documentHeight: shouldFetchFiltered ? documentHeight : 1080,
    }),
    [
      siteId,
      pagePath,
      deviceType,
      shouldFetchFiltered,
      documentWidth,
      documentHeight,
    ]
  );

  const { data: elementClicks, loading: elementLoading } =
    useElementClicks(elementParams);

  // Fetch scroll heatmap data
  const scrollParams = useMemo(
    () => ({
      siteId,
      pagePath,
      deviceType,
    }),
    [siteId, pagePath, deviceType]
  );

  const { data: scrollData, loading: scrollLoading } =
    useScrollHeatmapData(scrollParams);

  // Fetch hover heatmap data
  const hoverParams = useMemo(
    () => ({
      siteId,
      pagePath,
      deviceType,
    }),
    [siteId, pagePath, deviceType]
  );

  const { data: hoverData, loading: hoverLoading } =
    useHoverHeatmapData(hoverParams);

  // Fetch cursor paths data
  const cursorPathsParams = useMemo(
    () => ({
      siteId,
      pagePath,
      limit: 50,
    }),
    [siteId, pagePath]
  );

  const { data: cursorPathsData, loading: cursorPathsLoading } =
    useCursorPathsData(cursorPathsParams);

  // Show loading state - wait for snapshot AND relevant data type
  const isLoadingRelevantData = 
    dataType === "clicks" ? heatmapLoading :
    dataType === "elements" ? elementLoading :
    dataType === "scrolls" ? scrollLoading :
    dataType === "hover" ? hoverLoading :
    dataType === "cursor-paths" ? cursorPathsLoading :
    false;

  if (snapshotLoading || isLoadingRelevantData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center flex flex-col items-center justify-center">
          <LoadingSpinner size="large" />
          <p className="mt-8 text-gray-600">Loading visualization data...</p>
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
    // Check if this is a "snapshot not found" error
    const errorMessage = snapshotError?.message || "";
    const errorCode = (snapshotError as Error & { code?: string })?.code;
    const isSnapshotNotFound =
      errorCode === 'SNAPSHOT_NOT_FOUND' ||
      errorMessage.includes("Snapshot not found") ||
      errorMessage.includes("NOT_FOUND") ||
      errorMessage.includes("404") ||
      errorMessage.includes("No snapshot") ||
      errorMessage.includes("visitors need to stay");

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-blue-500 text-5xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isSnapshotNotFound
              ? "No Snapshot Captured Yet"
              : "Failed to Load Snapshot"}
          </h3>
          <p className="text-gray-600 mb-4">
            {isSnapshotNotFound
              ? `No visitors have stayed on this page (${deviceType}) long enough for a snapshot to be captured. Visitors need to stay for at least 5 seconds.`
              : errorMessage || "Snapshot data not available for this page"}
          </p>
          {isSnapshotNotFound ? (
            <div className="text-sm text-gray-500 mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-medium text-blue-800 mb-2">
                💡 How snapshots work:
              </p>
              <ul className="text-left list-disc list-inside space-y-1 text-blue-700">
                <li>Snapshots are captured after 5 seconds of page load</li>
                <li>This ensures the page has fully rendered</li>
                <li>Quick visitors who leave immediately won&apos;t trigger captures</li>
                <li>Once captured, the snapshot is cached for this device type</li>
              </ul>
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Only render after snapshot data is loaded (already checked above)
  // Determine which data to show based on showAllViewports state
  const currentHeatmapData =
    showAllViewports && allViewportsData
      ? allViewportsData.heatmap
      : heatmapData;

  const currentElementClicks =
    showAllViewports && allViewportsData
      ? allViewportsData.elements
      : elementClicks;

  // Pass heatmap data when clicks OR elements mode is selected
  // ElementOverlay needs heatmap points to calculate click counts for red highlights
  const heatmapPointsToPass: HeatmapPoint[] =
    dataType === "clicks" || dataType === "elements" ? currentHeatmapData : [];

  // Only pass element data when elements mode is selected
  const elementClicksToPass = dataType === "elements" ? currentElementClicks : [];

  console.log("📤 HeatmapViewer passing to SnapshotViewer:");
  console.log(
    "  - Heatmap:",
    currentHeatmapData?.length ?? 0,
    "points, showHeatmap:",
    showHeatmap,
    "dataType:",
    dataType,
    "→ willPass:",
    heatmapPointsToPass.length
  );
  console.log(
    "  - Elements:",
    currentElementClicks?.length ?? 0,
    "clicks, showElements:",
    showElements,
    "dataType:",
    dataType,
    "→ willPass:",
    elementClicksToPass.length
  );
  console.log(
    "  - Viewport:",
    showAllViewports
      ? "All Viewports (Normalized)"
      : `${documentWidth}x${documentHeight}`
  );

  return (
    <div className="w-full h-full relative">
      <SnapshotViewer
        snapshot={snapshotData!}
        heatmapPoints={heatmapPointsToPass}
        elementClicks={elementClicksToPass}
        scrollData={scrollData}
        hoverData={hoverData}
        cursorPathsData={cursorPathsData}
        siteId={siteId}
        pagePath={pagePath}
        deviceType={deviceType}
        userDevice={userDevice}
        showElements={showElements}
        showHeatmap={showHeatmap}
        dataType={dataType}
        onIframeScroll={onIframeScroll}
      />

      {/* Device Stats Sidebar for mobile/tablet */}
      <DeviceStatsBar
        deviceType={deviceType}
        heatmapPointsCount={heatmapPointsToPass.length}
        elementClicksCount={elementClicksToPass.length}
        contentWidth={documentWidth}
        contentHeight={documentHeight}
        viewportWidth={
          deviceType === "mobile"
            ? "375px"
            : deviceType === "tablet"
            ? "768px"
            : "100%"
        }
        isOpen={statsBarOpen}
        onOpenChange={onStatsBarOpenChange}
        onClose={onStatsBarClose}
        pagePath={pagePath}
        uniqueSessions={uniqueSessions}
      />
    </div>
  );
}
