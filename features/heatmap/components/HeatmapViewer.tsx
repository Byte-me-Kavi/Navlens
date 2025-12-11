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
import { SnapshotViewer } from "./SnapshotViewer";
import { DeviceStatsBar } from "./DeviceStatsBar";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { apiClient } from "@/shared/services/api/client";
import type { HeatmapPoint } from "@/features/heatmap/types/heatmap.types";
import type { ElementClick } from "@/features/element-tracking/types/element.types";

export interface HeatmapViewerProps {
  siteId: string;
  pagePath: string;
  deviceType: "desktop" | "tablet" | "mobile";
  dataType: "clicks" | "scrolls" | "hover" | "cursor-paths";
  showElements?: boolean;
  showHeatmap?: boolean;
  showAllViewports?: boolean;
  onViewportModeChange?: (showAll: boolean) => void;
  userDevice?: "desktop" | "tablet" | "mobile";
  statsBarOpen?: boolean;
  onStatsBarOpenChange?: () => void;
  onStatsBarClose?: () => void;
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
}: HeatmapViewerProps) {
  const [showAllViewports, setShowAllViewports] = useState(
    externalShowAllViewports
  );
  const [allViewportsData, setAllViewportsData] = useState<{
    heatmap: HeatmapPoint[];
    elements: ElementClick[];
  } | null>(null);

  // Handler to fetch all viewports data
  const handleShowAllViewports = useCallback(async () => {
    const newShowAllViewports = !showAllViewports;

    if (!newShowAllViewports) {
      // Switch back to filtered view
      setShowAllViewports(false);
      setAllViewportsData(null);
      onViewportModeChange?.(false);
      return;
    }

    try {
      // setLoadingAllViewports(true);

      // Fetch data from both "all viewports" endpoints
      const [heatmapResponse, elementsResponse] = await Promise.all([
        apiClient.post<{ clicks: HeatmapPoint[] }>(
          "/heatmap-clicks-all-viewports",
          {
            siteId,
            pagePath,
            deviceType,
          }
        ),
        apiClient.post<ElementClick[]>("/element-clicks-all-viewports", {
          siteId,
          pagePath,
          deviceType,
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
    } finally {
      // setLoadingAllViewports(false);
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

  // Fetch snapshot data first to get viewport dimensions
  const {
    data: snapshotData,
    loading: snapshotLoading,
    error: snapshotError,
  } = useSnapshot({ siteId, pagePath, deviceType });

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

  // Show loading state - wait for snapshot AND initial data attempts
  if (snapshotLoading || heatmapLoading || elementLoading || scrollLoading) {
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
    const isSnapshotNotFound =
      errorMessage.includes("Snapshot not found") ||
      errorMessage.includes("NOT_FOUND") ||
      errorMessage.includes("404");

    // Try to extract more details from the error
    let errorDetails = "";
    if (snapshotError && "details" in snapshotError) {
      errorDetails = (snapshotError as Error & { details: string }).details;
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-blue-500 text-5xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isSnapshotNotFound
              ? "No Snapshot Available"
              : "Failed to Load Snapshot"}
          </h3>
          <p className="text-gray-600 mb-4">
            {isSnapshotNotFound
              ? `No users have visited this page yet on ${deviceType}. Install the heatmap tracker to start collecting data.`
              : errorMessage || "Snapshot data not available for this page"}
          </p>
          {errorDetails && (
            <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded">
              <strong>Details:</strong>{" "}
              {typeof errorDetails === "string"
                ? errorDetails
                : JSON.stringify(errorDetails)}
            </div>
          )}
          {isSnapshotNotFound ? (
            <div className="text-sm text-gray-500 mb-4">
              <p>
                📊 <strong>How to get data:</strong>
              </p>
              <ol className="text-left list-decimal list-inside mt-2 space-y-1">
                <li>Install the heatmap tracking script on your website</li>
                <li>Wait for users to visit this page</li>
                <li>The snapshot will be automatically captured</li>
              </ol>
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

  const heatmapPointsToPass: HeatmapPoint[] =
    dataType === "clicks" ? currentHeatmapData : [];

  const elementClicksToPass = dataType === "clicks" ? currentElementClicks : [];

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
        siteId={siteId}
        pagePath={pagePath}
        deviceType={deviceType}
        userDevice={userDevice}
        showElements={showElements}
        showHeatmap={showHeatmap}
        dataType={dataType}
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
      />
    </div>
  );
}
