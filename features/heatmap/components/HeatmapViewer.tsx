/**
 * HeatmapViewer Component
 *
 * Main component that orchestrates heatmap visualization with modular architecture
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSnapshot } from "@/features/dom-snapshot/hooks/useSnapshot";
import { useHeatmapData } from "@/features/heatmap/hooks/useHeatmapData";
import { useElementClicks } from "@/features/element-tracking/hooks/useElementClicks";
import { useScrollHeatmapData } from "@/features/heatmap/hooks/useScrollHeatmapData";
import { useHoverHeatmapData } from "@/features/heatmap/hooks/useHoverHeatmapData";
import { useCursorPathsData } from "@/features/heatmap/hooks/useCursorPathsData";
import { SnapshotViewer } from "./SnapshotViewer";
import { 
  PhotoIcon, 
  ArrowPathIcon, 
  LightBulbIcon
} from "@heroicons/react/24/outline";
import { DeviceStatsBar } from "./DeviceStatsBar";
import { LoadingSpinner } from "@/shared/components/feedback/LoadingSpinner";
import { apiClient } from "@/shared/services/api/client";
import type { HeatmapPoint } from "@/features/heatmap/types/heatmap.types";
import type { ElementClick } from "@/features/element-tracking/types/element.types";

// SnapshotData type is used internally by useSnapshot hook

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
  showExportButton?: boolean;
  isStaticHeight?: boolean; // For report generation
  days?: number; // For date filtering
  shareToken?: string;
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
  showExportButton = true,
  isStaticHeight = false,
  days = 30, // Default to 30 days
  shareToken,
}: HeatmapViewerProps) {
  const [showAllViewports, setShowAllViewports] = useState(externalShowAllViewports);
  const [prevExternalShowAllViewports, setPrevExternalShowAllViewports] = useState(externalShowAllViewports);


  // Sync state with prop during render
  if (externalShowAllViewports !== prevExternalShowAllViewports) {
    setPrevExternalShowAllViewports(externalShowAllViewports);
    setShowAllViewports(externalShowAllViewports);
  }

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
  } = useSnapshot({ siteId, pagePath, deviceType, shareToken });
  // Effect to manage data fetching based on viewport mode
  useEffect(() => {
    let isMounted = true;

    async function manageViewportData() {
      // If showing all viewports and data is missing, fetch it
      if (showAllViewports && !allViewportsData) {
        try {
          // Calculate dates for "All Viewports" fetches if needed (apiClient manual calls)
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);

          const dateParams = { 
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString(),
            dateRangeDays: days // Pass this too just in case
          };

          const config = shareToken ? { headers: { 'x-share-token': shareToken } } : {};

          const [heatmapResponse, elementsResponse] = await Promise.all([
            apiClient.post<{ clicks: HeatmapPoint[] }>(
              "/heatmap-clicks-all-viewports",
              { siteId, pagePath, deviceType, ...dateParams },
              config
            ),
            apiClient.post<ElementClick[]>("/element-clicks-all-viewports", {
              siteId, pagePath, deviceType, ...dateParams
            }, config),
          ]);

          if (isMounted) {
            setAllViewportsData({
              heatmap: heatmapResponse.clicks || [],
              elements: elementsResponse || [],
            });
            // Notify parent if this was an internal change (though currently driven by prop)
            if (externalShowAllViewports !== showAllViewports) {
                onViewportModeChange?.(true);
            }
          }
        } catch (error) {
          console.error("Error fetching all viewports data:", error);
          alert("Failed to load data for all viewports. Please try again.");
          if (isMounted) setShowAllViewports(false);
        }
      } 
      // If NOT showing all viewports but we have data, clear it
      else if (!showAllViewports && allViewportsData) {
        setAllViewportsData(null);
        if (externalShowAllViewports !== showAllViewports) {
            onViewportModeChange?.(false);
        }
      }
    }

    manageViewportData();

    return () => { isMounted = false; };
  }, [showAllViewports, allViewportsData, siteId, pagePath, deviceType, externalShowAllViewports, onViewportModeChange, days, shareToken]);

  // Fetch unique session count for this page
  useEffect(() => {
    const fetchSessionCount = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const config = shareToken ? { headers: { 'x-share-token': shareToken } } : {};

        const response = await apiClient.post<{ sessions: number }>('/page-sessions', {
          siteId,
          pagePath,
          deviceType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }, config);
        setUniqueSessions(response.sessions || 0);
      } catch (_error) {
        // Fallback: estimate from heatmap data if API fails
        console.log('[HeatmapViewer] Could not fetch session count, using estimate');
        // Will be updated when heatmap data loads
      }
    };
    
    if (siteId && pagePath) {
      fetchSessionCount();
    }
  }, [siteId, pagePath, deviceType, days, shareToken]);

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
      dateRangeDays: days, // Pass days to hook
      shareToken // Pass share token
    }),
    [
      siteId,
      pagePath,
      deviceType,
      shouldFetchFiltered,
      documentWidth,
      documentHeight,
      days,
      shareToken,
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
      days: days, // Pass days
      shareToken, // Pass share token
    }),
    [
      siteId,
      pagePath,
      deviceType,
      shouldFetchFiltered,
      documentWidth,
      documentHeight,
      days,
      shareToken,
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
      days: days, // Pass days
      shareToken, // Pass share token
    }),
    [siteId, pagePath, deviceType, days, shareToken]
  );

  const { data: scrollData, loading: scrollLoading } =
    useScrollHeatmapData(scrollParams);

  // Fetch hover heatmap data
  const hoverParams = useMemo(
    () => ({
      siteId,
      pagePath,
      deviceType,
      days: days, // Pass days
      shareToken, // Pass share token
    }),
    [siteId, pagePath, deviceType, days, shareToken]
  );

  const { data: hoverData, loading: hoverLoading } =
    useHoverHeatmapData(hoverParams);

  // Fetch cursor paths data
  const cursorPathsParams = useMemo(
    () => ({
      siteId,
      pagePath,
      limit: 50,
      days: days, // Pass days
      shareToken, // Pass share token
    }),
    [siteId, pagePath, days, shareToken]
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

      <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
        <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center ring-8 ring-gray-50/50">
               <PhotoIcon className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isSnapshotNotFound
              ? "No Snapshot Captured Yet"
              : "Failed to Load Snapshot"}
          </h3>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            {isSnapshotNotFound
              ? `No visitors have stayed on this page (${deviceType}) long enough for a snapshot to be captured. Visitors need to stay for at least 5 seconds.`
              : errorMessage || "Snapshot data not available for this page"}
          </p>

          {isSnapshotNotFound ? (
            <div className="text-left bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3 text-indigo-900 font-semibold text-sm">
                <LightBulbIcon className="w-4 h-4 text-indigo-600" />
                How snapshots work
              </div>
              <ul className="space-y-2 text-sm text-indigo-800/80">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Snapshots capture after 5 seconds of activity
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Ensures full page rendering & data accuracy
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Bounced visitors won't trigger captures
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Cached automatically per device type
                </li>
              </ul>
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry Connection
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
    <div className={`w-full relative ${isStaticHeight ? 'h-auto min-h-[800px] overflow-hidden' : 'h-full'}`}>
      {/* Export Button */}


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
        isStaticHeight={isStaticHeight}
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
