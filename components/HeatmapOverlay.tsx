// components/HeatmapOverlay.tsx
"use client"; // This component will run on the client-side

import React, { useEffect, useRef, useState } from "react";
import h337 from "heatmap.js"; // Import heatmap.js

interface HeatmapRenderer {
  setDimensions: (width: number, height: number) => void;
}

interface HeatmapInstance extends h337.Heatmap<"value", "x", "y"> {
  _renderer?: HeatmapRenderer;
}

interface HeatmapPoint {
  x_bin: number;
  y_bin: number;
  count: number;
}

interface HeatmapOverlayProps {
  siteId: string;
  pagePath: string;
  imageWidth: number; // Add these props
  imageHeight: number; // Add these props
}

const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
  siteId,
  pagePath,
  imageWidth,
  imageHeight,
}) => {
  const heatmapRef = useRef<HTMLDivElement>(null);
  const [heatmapInstance, setHeatmapInstance] =
    useState<HeatmapInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 1. Initialize Heatmap.js ---
  useEffect(() => {
    if (heatmapRef.current && !heatmapInstance) {
      const instance = h337.create({
        container: heatmapRef.current,
        radius: 20, // Adjust radius to control "spread" of heatmap points
        maxOpacity: 0.5,
        minOpacity: 0,
        blur: 0.75,
        // gradient: { // Customize gradient if desired
        //   '0.0': 'blue',
        //   '0.5': 'cyan',
        //   '0.7': 'lime',
        //   '0.9': 'yellow',
        //   '1.0': 'red'
        // }
      });
      setHeatmapInstance(instance);
    }
  }, [heatmapRef, heatmapInstance]);

  // --- 2. Fetch Heatmap Data ---
  useEffect(() => {
    if (!heatmapInstance || !siteId || !pagePath) return;

    const fetchHeatmapData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/heatmap-clicks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            siteId,
            pagePath,
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // The actual data is usually nested under 'data' property in ClickHouse client response
        const points: HeatmapPoint[] = data.data || [];

        // Find the max count to scale heatmap values properly
        const maxCount = Math.max(...points.map((p) => p.count), 1); // Ensure at least 1 to avoid /0

        // --- 3. Transform and Set Data ---
        const heatmapData = points.map((p) => ({
          x: Math.round((p.x_bin / 100) * window.innerWidth), // Convert relative bin back to absolute pixel X
          y: Math.round((p.y_bin / 100) * window.innerHeight), // Convert relative bin back to absolute pixel Y
          value: p.count, // The count for the heatmap intensity
        }));

        heatmapInstance.setData({
          min: 0,
          max: maxCount,
          data: heatmapData,
        });
      } catch (err: Error | unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "An unknown error occurred";
        console.error("Failed to fetch heatmap data:", err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmapData();

    // Optional: Re-fetch on window resize to adjust points (more complex for dynamic heatmaps)
    const handleResize = () => {
      // For simple resize, just re-fetch data to re-calculate x,y.
      // For very large datasets, you might debounce this or only update the heatmap instance
      // without re-fetching if only x,y transform is needed.
      fetchHeatmapData();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [heatmapInstance, siteId, pagePath]); // Re-run if instance or props change

  // --- 4. Resize the heatmap canvas to match image dimensions ---
  useEffect(() => {
    if (
      heatmapInstance &&
      imageWidth &&
      imageHeight &&
      heatmapInstance._renderer
    ) {
      // Resize the heatmap canvas to match image dimensions
      heatmapInstance._renderer.setDimensions(imageWidth, imageHeight);

      // Also resize and position the canvas element itself
      const canvas = heatmapRef.current?.querySelector("canvas");
      if (canvas) {
        canvas.style.position = "absolute";
        canvas.style.left = "0px";
        canvas.style.top = "0px";
        canvas.style.width = `${imageWidth}px`;
        canvas.style.height = `${imageHeight}px`;
        canvas.style.zIndex = "100";
        canvas.style.margin = "0";
        canvas.style.padding = "0";
        canvas.style.border = "none";
        canvas.style.boxSizing = "border-box";
      }
    }
  }, [heatmapInstance, imageWidth, imageHeight]);

  // --- 5. Render the Overlay ---
  return (
    <div
      ref={heatmapRef}
      style={{
        position: "absolute", // Position over content
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Allow clicks to pass through to underlying elements
        zIndex: 9999, // Ensure it's on top
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "1px",
            borderRadius: "5px",
          }}
        >
          Loading Heatmap...
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(255,0,0,0.7)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default HeatmapOverlay;
