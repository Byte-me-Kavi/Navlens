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
    const buildWithRetry = (attempts = 0, maxAttempts = 5) => {
      if (!iframe.contentDocument && attempts < maxAttempts) {
        console.log(
          `⏳ Waiting for iframe document (attempt ${
            attempts + 1
          }/${maxAttempts})...`
        );
        setTimeout(
          () => buildWithRetry(attempts + 1, maxAttempts),
          50 * Math.pow(2, attempts)
        );
        return;
      }

      if (!iframe.contentDocument) {
        console.error("❌ Iframe document not available after retries");
        return;
      }

      try {
        DomBuilder.buildDOM(iframe, {
          snapshot: snapshot.snapshot,
          styles: snapshot.styles || [],
          origin: snapshot.origin || window.location.origin,
        });

        // Wait a bit for DOM to settle before getting dimensions
        setTimeout(() => {
          if (!iframe.contentDocument) return;

          const dimensions = DomBuilder.getContentDimensions(iframe);
          console.log("📐 Content dimensions:", dimensions);

          setContentDimensions(dimensions);
          setIsReady(true);
        }, 100);
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

    // Add small delay to ensure overlay DOM elements are in the document
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
      }
    }, 100);

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
      {/* Iframe for DOM reconstruction */}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-none absolute top-0 left-0"
        style={{ zIndex: 1 }}
        sandbox="allow-same-origin"
        title="Page Snapshot"
      />

      {/* Heatmap Canvas Layer */}
      {isReady && heatmapPoints.length > 0 && (
        <HeatmapCanvas
          points={heatmapPoints}
          width={contentDimensions.width}
          height={contentDimensions.height}
          iframe={iframeRef.current}
        />
      )}

      {/* Element Overlay Layer */}
      {isReady && elementClicks.length > 0 && (
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
