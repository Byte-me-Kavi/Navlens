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
}

export function SnapshotViewer({
  snapshot,
  heatmapPoints,
  elementClicks,
  siteId,
  pagePath,
  deviceType,
}: SnapshotViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollSyncRef = useRef<ScrollSync>(new ScrollSync());
  const [contentDimensions, setContentDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [overlaysRendered, setOverlaysRendered] = useState(0);

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
            setIsReady(true);
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
    <div
      ref={containerRef}
      className="w-full h-full bg-white border border-gray-300 relative overflow-hidden"
    >
      {/* Iframe for DOM reconstruction (z-1) */}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-none absolute top-0 left-0"
        style={{ zIndex: 1 }}
        sandbox="allow-same-origin"
        title="Page Snapshot"
      />

      {/* Heatmap Canvas Layer (z-50) - Heat blobs behind overlays */}
      {/* Always render to ensure container exists for ScrollSync */}
      {isReady && (
        <HeatmapCanvas
          points={heatmapPoints}
          width={contentDimensions.width}
          height={contentDimensions.height}
          iframe={iframeRef.current}
        />
      )}

      {/* Element Overlay Layer (z-100+) - Element highlights and click points on top */}
      {/* Always render to ensure container exists for ScrollSync */}
      {isReady && (
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
  );
}
