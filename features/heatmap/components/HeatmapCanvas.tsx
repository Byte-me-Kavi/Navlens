/**
 * HeatmapCanvas Component
 *
 * Renders heatmap visualization using heatmap.js
 */

"use client";

import { useEffect, useRef } from "react";
import { HeatmapRenderer } from "../services/heatmapRenderer";
import { heatmapApi } from "../services/heatmapApi";
import type { HeatmapPoint } from "../types/heatmap.types";

interface HeatmapCanvasProps {
  points: HeatmapPoint[];
  width: number;
  height: number;
  iframe: HTMLIFrameElement | null;
}

export function HeatmapCanvas({
  points,
  width,
  height,
  iframe,
}: HeatmapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HeatmapRenderer>(new HeatmapRenderer());

  // Initialize heatmap instance
  useEffect(() => {
    if (!containerRef.current || width === 0 || height === 0) return;

    console.log("🎨 Initializing heatmap canvas:", { width, height });

    const container = containerRef.current;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    rendererRef.current.create(container);

    return () => {
      rendererRef.current.destroy();
    };
  }, [width, height]);

  // Update heatmap data
  useEffect(() => {
    console.log("🔍 Heatmap update check:", {
      isInitialized: rendererRef.current.isInitialized(),
      hasIframe: !!iframe,
      pointsLength: points.length,
      width,
      height,
    });

    if (!rendererRef.current.isInitialized()) {
      console.warn("⚠️ Heatmap renderer not initialized yet");
      return;
    }

    if (!iframe) {
      console.warn("⚠️ No iframe available for heatmap");
      return;
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      console.warn("⚠️ No iframe.contentDocument available");
      return;
    }

    const currentDocWidth = doc.documentElement.scrollWidth || width;
    const currentDocHeight = doc.documentElement.scrollHeight || height;

    console.log("🎨 Updating heatmap data:", {
      pointCount: points.length,
      docWidth: currentDocWidth,
      docHeight: currentDocHeight,
      samplePoint: points[0],
    });

    if (points.length === 0) {
      console.warn("⚠️ No heatmap points to render!");
      return;
    }

    const heatmapData = heatmapApi.transformToHeatmapData(
      points,
      currentDocWidth,
      currentDocHeight
    );

    console.log("🔥 Transformed heatmap data:", {
      max: heatmapData.max,
      dataLength: heatmapData.data.length,
      sampleData: heatmapData.data[0],
    });

    rendererRef.current.setData(heatmapData);
    console.log("✓ Heatmap data set successfully");
  }, [points, width, height, iframe]);

  return (
    <div
      id="heatmap-canvas-container"
      ref={containerRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        zIndex: 50,
        background: "transparent",
        transformOrigin: "top left",
        willChange: "transform",
      }}
    />
  );
}
