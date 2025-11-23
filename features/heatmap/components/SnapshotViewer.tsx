/**
 * SnapshotViewer Component
 *
 * Handles DOM reconstruction and overlay rendering
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { DomBuilder } from "@/features/dom-snapshot/services/domBuilder";
import { ScrollSync } from "@/features/dom-snapshot/services/scrollSync";
import { HeatmapCanvas } from "@/features/heatmap/components/HeatmapCanvas";
import { ElementOverlay } from "@/features/element-tracking/components/ElementOverlay";
import type { SnapshotData } from "@/features/dom-snapshot/types/snapshot.types";
import type { HeatmapPoint } from "@/features/heatmap/types/heatmap.types";
import type { ElementClick } from "@/features/element-tracking/types/element.types";

interface SnapshotViewerProps {
  snapshot: SnapshotData;
  heatmapPoints: HeatmapPoint[];
  elementClicks: ElementClick[];
  siteId: string;
  pagePath: string;
  deviceType: string;
  userDevice?: "desktop" | "mobile" | "tablet";
}

export function SnapshotViewer({
  snapshot,
  heatmapPoints,
  elementClicks,
  siteId,
  pagePath,
  deviceType,
  userDevice = "desktop",
}: SnapshotViewerProps) {
  console.log("🎯 SnapshotViewer received:", {
    heatmapPointsCount: heatmapPoints?.length ?? 0,
    heatmapPointsType: typeof heatmapPoints,
    isArray: Array.isArray(heatmapPoints),
    firstPoint: heatmapPoints?.[0],
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollSyncRef = useRef<ScrollSync>(new ScrollSync());
  const [contentDimensions, setContentDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [overlaysRendered, setOverlaysRendered] = useState(0);

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

    const container = containerRef.current;
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

      const canvasContainer = document.getElementById(
        "heatmap-canvas-container"
      );
      const overlayContainer = document.getElementById(
        "element-overlay-container"
      );

      console.log(
        "📦 Container check - canvas:",
        !!canvasContainer,
        "overlay:",
        !!overlayContainer
      );

      const overlays = [canvasContainer, overlayContainer].filter(
        Boolean
      ) as HTMLElement[];

      if (overlays.length > 0) {
        console.log(
          "🚀 Initializing ScrollSync with",
          overlays.length,
          "containers"
        );
        scrollSyncRef.current.initialize(iframeRef.current!, overlays);
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
          const retryOverlays = [retryCanvas, retryOverlay].filter(
            Boolean
          ) as HTMLElement[];

          if (retryOverlays.length > 0) {
            console.log("🔄 Retry: Found", retryOverlays.length, "containers");
            scrollSyncRef.current.initialize(iframeRef.current!, retryOverlays);
          }
        }, 200);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      scrollSyncRef.current.cleanup();
    };
  }, [isReady, overlaysRendered]);

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

        {/* Heatmap Canvas Layer (z-50) - Only render when ready and iframe loaded */}
        {isReady && isIframeLoaded && (
          <HeatmapCanvas
            points={heatmapPoints}
            width={contentDimensions.width}
            height={contentDimensions.height}
            iframe={iframeRef.current}
          />
        )}

        {/* Element Overlay Layer (z-100+) - Only render when ready and iframe loaded */}
        {isReady && isIframeLoaded && (
          <ElementOverlay
            elements={elementClicks}
            iframe={iframeRef.current}
            siteId={siteId}
            pagePath={pagePath}
            deviceType={deviceType}
            onOverlaysRendered={() => setOverlaysRendered((prev) => prev + 1)}
          />
        )}
      </div>
    </div>
  );
}
