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
    if (!rendererRef.current.isInitialized() || !iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const currentDocWidth = doc.documentElement.scrollWidth || width;
    const currentDocHeight = doc.documentElement.scrollHeight || height;

    console.log("🎨 Updating heatmap data:", {
      pointCount: points.length,
      docWidth: currentDocWidth,
      docHeight: currentDocHeight,
    });

    const heatmapData = heatmapApi.transformToHeatmapData(
      points,
      currentDocWidth,
      currentDocHeight
    );

    rendererRef.current.setData(heatmapData);
  }, [points, width, height, iframe]);

  return (
    <div
      id="heatmap-canvas-container"
      ref={containerRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        zIndex: 100,
        background: "transparent",
        transformOrigin: "top left",
        willChange: "transform",
      }}
    />
  );
}
