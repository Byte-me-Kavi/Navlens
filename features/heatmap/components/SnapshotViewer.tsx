/**
 * SnapshotViewer Component
 *
 * Handles DOM reconstruction and overlay rendering
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DomBuilder } from "@/features/dom-snapshot/services/domBuilder";
import { ScrollSync } from "@/features/dom-snapshot/services/scrollSync";
import { HeatmapCanvas } from "@/features/heatmap/components/HeatmapCanvas";
import { ElementOverlay } from "@/features/element-tracking/components/ElementOverlay";
import { ScrollHeatmapOverlay } from "@/features/heatmap/components/ScrollHeatmapOverlay";
import { CursorPathsOverlay } from "@/features/heatmap/components/CursorPathsOverlay";
import type { SnapshotData } from "@/features/dom-snapshot/types/snapshot.types";
import type { HeatmapPoint } from "@/features/heatmap/types/heatmap.types";
import { HOVER_HEATMAP_CONFIG } from "@/features/heatmap/types/heatmap.types";
import type { ElementClick } from "@/features/element-tracking/types/element.types";
import type { HoverHeatmapData } from "@/features/heatmap/hooks/useHoverHeatmapData";
import type { CursorPathsData } from "@/features/heatmap/hooks/useCursorPathsData";

interface SnapshotViewerProps {
  snapshot: SnapshotData;
  heatmapPoints: HeatmapPoint[];
  elementClicks: ElementClick[];
  scrollData?: {
    totalSessions: number;
    scrollData: Array<{
      scroll_percentage: number;
      sessions: number;
    }>;
  };
  hoverData?: HoverHeatmapData | null;
  cursorPathsData?: CursorPathsData | null;
  siteId: string;
  pagePath: string;
  deviceType: string;
  userDevice?: "desktop" | "mobile" | "tablet";
  showElements?: boolean;
  showHeatmap?: boolean;
  dataType?: "clicks" | "scrolls" | "hover" | "cursor-paths" | "elements";
  onIframeScroll?: (scrollY: number) => void;
}

export function SnapshotViewer({
  snapshot,
  heatmapPoints,
  elementClicks,
  scrollData,
  hoverData,
  cursorPathsData,
  siteId,
  pagePath,
  deviceType,
  userDevice = "desktop",
  showElements: _showElements = true,
  showHeatmap = true,
  dataType = "clicks",
  onIframeScroll,
}: SnapshotViewerProps) {
  console.log("🎯 SnapshotViewer received:", {
    dataType,
    heatmapPointsCount: heatmapPoints?.length ?? 0,
    hoverData: hoverData ? {
      pointsCount: hoverData.heatmapPoints?.length ?? 0,
      zonesCount: hoverData.attentionZones?.length ?? 0,
      note: hoverData.note,
    } : null,
    cursorPathsData: cursorPathsData ? {
      totalSessions: cursorPathsData.totalSessions,
      sessionsCount: cursorPathsData.sessions?.length ?? 0,
      patternBreakdown: cursorPathsData.patternBreakdown,
    } : null,
    showHeatmap,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollSyncRef = useRef<ScrollSync>(new ScrollSync());
  const [iframeElement, setIframeElement] = useState<HTMLIFrameElement | null>(
    null
  );
  const [contentDimensions, setContentDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [overlaysRendered, setOverlaysRendered] = useState(0);

  // Memoize the callback to prevent infinite re-renders
  const handleOverlaysRendered = useCallback(() => {
    setOverlaysRendered((prev) => prev + 1);
  }, []);

  // Track window size for auto-refresh on resize
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        console.log("🔄 Window resized, refreshing page...");
        window.location.reload();
      }, 500); // Wait 500ms after resize stops
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update iframe element state when ref changes
  useEffect(() => {
    setIframeElement(iframeRef.current);
  }, []);

  // Setup iframe scroll listener for auto-minimize navbar
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !onIframeScroll) return;

    const handleScroll = () => {
      const scrollY = iframeRef.current?.contentWindow?.scrollY || 0;
      onIframeScroll(scrollY);
    };

    const contentWindow = iframeRef.current.contentWindow;
    contentWindow.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      contentWindow?.removeEventListener('scroll', handleScroll);
    };
  }, [isReady, onIframeScroll]);

  // Get device-specific viewport configuration
  const getDeviceConfig = () => {
    // If user is on mobile viewing mobile heatmap, take full width
    if (userDevice === "mobile" && deviceType === "mobile") {
      return { width: "100%", marginRight: "0" };
    }
    // If user is on tablet viewing tablet heatmap, take full width
    if (userDevice === "tablet" && deviceType === "tablet") {
      return { width: "100%", marginRight: "0" };
    }

    // Otherwise use fixed widths
    switch (deviceType) {
      case "mobile":
        return { width: "375px", marginRight: "160px" };
      case "tablet":
        return { width: "800px", marginRight: "160px" };
      case "desktop":
      default:
        return { width: "100%", marginRight: "0" };
    }
  };

  const deviceConfig = getDeviceConfig();

  // Build DOM when snapshot changes
  useEffect(() => {
    if (!snapshot || !iframeRef.current || !containerRef.current) return;

    console.log("🏗️ Building DOM from snapshot...");

    const iframe = iframeRef.current;

    // Wait for iframe to be ready, then build the DOM
    const buildWithRetry = (attempts = 0, maxAttempts = 8) => {
      if (!iframe.contentDocument && attempts < maxAttempts) {
        console.log(
          `⏳ Waiting for iframe document (attempt ${
            attempts + 1
          }/${maxAttempts})...`
        );
        const delay = attempts < 3 ? 100 : 200 * Math.pow(1.5, attempts - 3);
        setTimeout(() => buildWithRetry(attempts + 1, maxAttempts), delay);
        return;
      }

      if (!iframe.contentDocument) {
        console.error("❌ Iframe document not available after retries");
        // Try one more time with longer delay
        if (attempts === maxAttempts) {
          console.log("🔄 Final retry in 1 second...");
          setTimeout(() => buildWithRetry(attempts + 1, maxAttempts + 1), 1000);
        }
        return;
      }

      try {
        DomBuilder.buildDOM(iframe, {
          snapshot: snapshot.snapshot,
          styles: snapshot.styles || [],
          origin: snapshot.origin || window.location.origin,
        });

        // Wait for DOM to settle before getting dimensions
        setTimeout(() => {
          if (!iframe.contentDocument) return;

          const dimensions = DomBuilder.getContentDimensions(iframe);
          console.log("📐 Content dimensions:", dimensions);

          if (dimensions.width === 0 || dimensions.height === 0) {
            console.warn("⚠️ Invalid dimensions, retrying...");
            setTimeout(() => {
              const retryDimensions = DomBuilder.getContentDimensions(iframe);
              setContentDimensions(retryDimensions);
              setIsReady(true);
            }, 200);
          } else {
            setContentDimensions(dimensions);
            // Add delay before marking ready to ensure iframe is fully painted
            setTimeout(() => {
              setIsReady(true);
            }, 200);
          }
        }, 150);
      } catch (error) {
        console.error("❌ Failed to build DOM:", error);
      }
    };

    // Start building with retry logic
    buildWithRetry();

    return () => {
      setIsReady(false);
    };
  }, [snapshot]);

  // Setup scroll sync when ready AND after overlays are rendered
  useEffect(() => {
    const scrollSync = scrollSyncRef.current;
    if (!isReady || !iframeRef.current) {
      console.log(
        "⏳ ScrollSync waiting - isReady:",
        isReady,
        "iframe:",
        !!iframeRef.current
      );
      return;
    }

    // Add delay to ensure overlay DOM elements are in the document
    // Increase from 100ms to 250ms to ensure React has time to render components
    const timeoutId = setTimeout(() => {
      console.log("🔄 Setting up ScrollSync...");

      const scrollSync = scrollSyncRef.current;

      const canvasContainer = document.getElementById(
        "heatmap-canvas-container"
      );
      const overlayContainer = document.getElementById(
        "element-overlay-container"
      );
      const scrollOverlayContainer = document.getElementById(
        "scroll-heatmap-overlay"
      );

      console.log(
        "📦 Container check - canvas:",
        !!canvasContainer,
        "overlay:",
        !!overlayContainer,
        "scroll:",
        !!scrollOverlayContainer
      );

      const overlays = [
        canvasContainer,
        overlayContainer,
        scrollOverlayContainer,
      ].filter(Boolean) as HTMLElement[];

      if (overlays.length > 0) {
        console.log(
          "🚀 Initializing ScrollSync with",
          overlays.length,
          "containers"
        );
        scrollSync.initialize(iframeRef.current!, overlays);
      } else {
        console.warn("⚠️ No overlay containers found for ScrollSync");
        // Retry after another delay if containers not found
        setTimeout(() => {
          const retryCanvas = document.getElementById(
            "heatmap-canvas-container"
          );
          const retryOverlay = document.getElementById(
            "element-overlay-container"
          );
          const retryScrollOverlay = document.getElementById(
            "scroll-heatmap-overlay"
          );
          const retryOverlays = [
            retryCanvas,
            retryOverlay,
            retryScrollOverlay,
          ].filter(Boolean) as HTMLElement[];

          if (retryOverlays.length > 0) {
            console.log("🔄 Retry: Found", retryOverlays.length, "containers");
            scrollSync.initialize(iframeRef.current!, retryOverlays);
          }
        }, 200);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      scrollSync.cleanup();
    };
  }, [isReady, overlaysRendered, dataType]);

  return (
    <div className="w-full h-full flex items-start justify-center bg-blue-100 p-4 overflow-auto">
      <div
        ref={containerRef}
        className="bg-white border border-gray-300 shadow-2xl rounded-lg relative overflow-hidden"
        style={{
          width: deviceConfig.width,
          height: "calc(100vh - 2rem)",
          maxWidth: "100%",
        }}
      >
        {/* Loading indicator while iframe is being built */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Loading snapshot...</p>
            </div>
          </div>
        )}

        {/* Iframe for DOM reconstruction (z-1) */}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none absolute top-0 left-0"
          style={{ zIndex: 1 }}
          sandbox="allow-same-origin"
          title="Page Snapshot"
          onLoad={() => {
            console.log("✅ Iframe onLoad fired");
            setIsIframeLoaded(true);
          }}
        />

        {/* Scroll Heatmap Overlay Layer (z-40) - Only render when dataType is "scrolls" */}
        {dataType === "scrolls" &&
          scrollData &&
          scrollData.totalSessions > 0 && (
            <ScrollHeatmapOverlay
              scrollData={scrollData.scrollData}
              totalSessions={scrollData.totalSessions}
              height={contentDimensions.height}
              iframeRef={iframeRef}
              onOverlaysRendered={handleOverlaysRendered}
            />
          )}

        {/* Heatmap Canvas Layer (z-50) - Render for clicks mode */}
        {isReady && isIframeLoaded && dataType === "clicks" && showHeatmap && (
          <HeatmapCanvas
            points={heatmapPoints}
            width={contentDimensions.width}
            height={contentDimensions.height}
            iframe={iframeElement}
          />
        )}

        {/* Element Overlay Layer (z-100+) - Render when dataType is "elements" */}
        {isReady && isIframeLoaded && dataType === "elements" && (
          <ElementOverlay
            elements={elementClicks}
            iframe={iframeElement}
            siteId={siteId}
            pagePath={pagePath}
            deviceType={deviceType}
            onOverlaysRendered={handleOverlaysRendered}
            heatmapClicks={heatmapPoints}
          />
        )}

        {/* Hover Heatmap Layer (z-55) - Render for hover mode using click-based attention data */}
        {isReady && isIframeLoaded && dataType === "hover" && showHeatmap && hoverData && (
          <>
            <HeatmapCanvas
              points={hoverData.heatmapPoints?.map(p => ({
                x: p.x * contentDimensions.width,
                y: p.y * contentDimensions.height,
                value: p.intensity * 100,
              })) || []}
              width={contentDimensions.width}
              height={contentDimensions.height}
              iframe={iframeElement}
              config={HOVER_HEATMAP_CONFIG}
            />
            {/* Attention zones summary */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Attention Zones</h4>
              <div className="space-y-1">
                {hoverData.attentionZones?.map((zone) => (
                  <div key={zone.zone} className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-gray-600 capitalize">{zone.zone}</span>
                    <span className="font-medium text-cyan-600">{zone.percentage}%</span>
                  </div>
                ))}
              </div>
              {hoverData.note && (
                <p className="text-xs text-gray-400 mt-2 border-t pt-2">{hoverData.note}</p>
              )}
            </div>
          </>
        )}

        {/* Cursor Paths Layer (z-60) - Render for cursor-paths mode */}
        {isReady && isIframeLoaded && dataType === "cursor-paths" && (
          <CursorPathsOverlay
            data={cursorPathsData || null}
            width={contentDimensions.width}
            height={contentDimensions.height}
            iframeRef={iframeRef}
          />
        )}
      </div>
    </div>
  );
}
