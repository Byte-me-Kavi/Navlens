// app/dashboard/heatmap-viewer/page.tsx
"use client"; // This component will be client-side rendered

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import h337 from "heatmap.js"; // Properly import heatmap.js

const SITE_ID = "a2a95f61-1024-40f8-af7e-4c4df2fcbd01"; // IMPORTANT: Use your actual SITE_ID

export default function HeatmapViewer() {
  const [pagePath, setPagePath] = useState("/"); // Default to homepage
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0); // Force re-render of image element

  // --- Fetch Heatmap Data ---
  const fetchHeatmapData = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/heatmap-clicks?siteId=${SITE_ID}&pagePath=${encodeURIComponent(
          path
        )}`
        // You can add startDate & endDate parameters here if you add UI for them
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched heatmap data:", data); // Debugging
      return data.data || []; // ClickHouse client wraps data in `data` field
    } catch (err: any) {
      console.error("Failed to fetch heatmap data:", err);
      setError(`Failed to fetch heatmap data: ${err.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // --- Initialize Heatmap ---
  useEffect(() => {
    if (heatmapContainerRef.current && !heatmapInstance) {
      // Initialize heatmap.js instance with refined appearance settings
      const instance = h337.create({
        container: heatmapContainerRef.current,
        radius: 30, // Increased for more spread/visible hotspots
        maxOpacity: 0.7, // More visible opacity
        minOpacity: 0.1, // Slight minimum visibility for subtle areas
        blur: 0.85, // Higher blur for smoother gradients
        gradient: {
          // Custom gradient: blue (cold) → cyan → green → yellow → red (hot)
          "0.0": "rgba(0, 0, 255, 0)", // Transparent blue
          "0.2": "rgba(0, 150, 255, 0.5)", // Light blue
          "0.4": "rgba(0, 255, 255, 0.6)", // Cyan
          "0.6": "rgba(0, 255, 0, 0.7)", // Green
          "0.8": "rgba(255, 255, 0, 0.8)", // Yellow
          "1.0": "rgba(255, 0, 0, 0.9)", // Red
        },
      });
      setHeatmapInstance(instance);
    }
  }, [heatmapInstance]);

  // --- Render Heatmap on Data Change ---
  useEffect(() => {
    const renderHeatmap = async () => {
      if (!heatmapInstance || !pagePath) return;

      try {
        const rawData = await fetchHeatmapData(pagePath);

        if (!rawData || rawData.length === 0) {
          heatmapInstance.setData({ min: 0, max: 1, data: [] });
          return;
        }

        // Transform ClickHouse data format to heatmap.js format
        const heatmapData = rawData.map(
          (d: { x_bin: number; y_bin: number; count: number }) => ({
            x: d.x_bin,
            y: d.y_bin,
            value: d.count,
          })
        );

        // Calculate max value for color scaling
        const maxCount = Math.max(
          ...heatmapData.map((d: { value: number }) => d.value),
          1
        );

        // Scale x_bin/y_bin to actual container pixels
        const containerWidth =
          heatmapContainerRef.current?.offsetWidth || window.innerWidth;
        const containerHeight =
          heatmapContainerRef.current?.offsetHeight || window.innerHeight;

        const scaledHeatmapData = heatmapData.map(
          (d: { x: number; y: number; value: number }) => ({
            x: Math.round((d.x / 100) * containerWidth),
            y: Math.round((d.y / 100) * containerHeight),
            value: d.value,
          })
        );

        heatmapInstance.setData({
          min: 0,
          max: maxCount,
          data: scaledHeatmapData,
        });
      } catch (err) {
        console.error("Error rendering heatmap:", err);
      }
    };

    renderHeatmap();
  }, [pagePath, heatmapInstance]);

  // --- Mock Page Paths (Replace with dynamic fetching if needed) ---
  const pagePaths = [
    "/",
    "/dashboard",
    "/products",
    "/contact",
    // Add more pages you want to view
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Head>
        <title>Heatmap Viewer</title>
      </Head>

      <main className="container mx-auto bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Heatmap Viewer</h1>

        <div className="mb-4">
          <label
            htmlFor="pagePathSelect"
            className="block text-sm font-medium text-gray-700"
          >
            Select Page:
          </label>
          <select
            id="pagePathSelect"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={pagePath}
            onChange={(e) => {
              setPagePath(e.target.value);
              setImageKey((prev) => prev + 1); // Force image re-render
            }}
          >
            {pagePaths.map((path) => (
              <option key={path} value={path}>
                {path === "/" ? "Homepage" : path}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-blue-500">Loading heatmap data...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        <div className="relative w-full h-[600px] border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
          {/* Screenshot as background for context */}
          {pagePath && (
            <>
              <img
                key={imageKey}
                src={`/screenshots/${
                  pagePath === "/" ? "home" : pagePath.replace(/\//g, "")
                }.png`}
                alt={`Screenshot of ${pagePath}`}
                className="absolute inset-0 w-full h-full object-contain"
                onError={(e) => {
                  // If screenshot doesn't exist, just hide it
                  console.warn(
                    `Screenshot not found: ${
                      (e.target as HTMLImageElement).src
                    }`
                  );
                  e.currentTarget.style.display = "none";
                }}
              />
            </>
          )}

          {/* Heatmap overlay (this div must be on top) */}
          <div
            ref={heatmapContainerRef}
            className="absolute inset-0 w-full h-full z-10"
          ></div>

          {/* Text to show if no heatmap data */}
          {!loading &&
            !error &&
            heatmapInstance &&
            heatmapInstance.getData &&
            heatmapInstance.getData().data &&
            heatmapInstance.getData().data.length === 0 && (
              <p className="absolute z-20 text-gray-500 text-lg">
                No heatmap data available for this page/period.
              </p>
            )}
        </div>
      </main>
    </div>
  );
}
