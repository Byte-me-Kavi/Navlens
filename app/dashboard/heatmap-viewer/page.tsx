// app/dashboard/heatmap-viewer/page.tsx
"use client"; // This component will be client-side rendered

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import h337 from "heatmap.js"; // Properly import heatmap.js
import { createBrowserClient } from "@supabase/ssr"; // Import Supabase client

const SITE_ID = "a2a95f61-1024-40f8-af7e-4c4df2fcbd01"; // IMPORTANT: Use your actual SITE_ID
// IMPORTANT: This should be your *client's* domain, not your dashboard's
const CLIENT_DOMAIN = "https://navlens-rho.vercel.app";

// Initialize the *public* Supabase client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HeatmapViewer() {
  const [pagePath, setPagePath] = useState("/"); // Default to homepage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0); // Force re-render of image element
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null); // State for the screenshot

  // --- Helper to get the predictable screenshot URL ---
  const getScreenshotUrl = (siteId: string, path: string) => {
    const filePath = `${siteId}/${encodeURIComponent(path)}.png`;
    const { data } = supabase.storage
      .from("screenshots")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  // --- Fetch Heatmap Data ---
  const fetchHeatmapData = async (path: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/heatmap-clicks?siteId=${SITE_ID}&pagePath=${encodeURIComponent(
          path
        )}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Fetched heatmap data:", data); // Debugging
      return data.data || []; // ClickHouse client wraps data in `data` field
    } catch (err: Error | unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch heatmap data:", err);
      setError(`Failed to fetch heatmap data: ${errorMsg}`);
      return [];
    } finally {
      setLoadingData(false);
    }
  };

  // --- Handler for the "Refresh Screenshot" button ---
  const handleRefreshScreenshot = async () => {
    setLoadingScreenshot(true);
    setError(null);

    const pageUrlToScreenshot = CLIENT_DOMAIN + pagePath;

    try {
      const response = await fetch("/api/generate-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrlToScreenshot: pageUrlToScreenshot,
          siteId: SITE_ID,
          pagePath: pagePath,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate screenshot");
      }

      const { publicUrl } = await response.json();

      // Update the screenshot URL in state with a new cache-busting timestamp
      setScreenshotUrl(`${publicUrl}?t=${new Date().getTime()}`);
      setImageKey((prev) => prev + 1); // Force image re-render
    } catch (err: Error | unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoadingScreenshot(false);
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

  // --- Load Data AND Screenshot when pagePath changes ---
  useEffect(() => {
    const loadData = async () => {
      if (!heatmapInstance || !pagePath) return;

      try {
        // 1. Get the screenshot URL from Supabase storage
        const url = getScreenshotUrl(SITE_ID, pagePath);
        // Add a cache-busting query parameter
        setScreenshotUrl(`${url}?t=${new Date().getTime()}`);
        setImageKey((prev) => prev + 1);

        // 2. Fetch heatmap data
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
        console.error("Error loading data:", err);
      }
    };

    loadData();
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

        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
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

          <button
            onClick={handleRefreshScreenshot}
            disabled={loadingScreenshot}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 h-fit mt-6"
          >
            {loadingScreenshot ? "Refreshing..." : "Refresh Screenshot"}
          </button>
        </div>

        {loadingData && (
          <p className="text-blue-500">Loading heatmap data...</p>
        )}
        {error && <p className="text-red-500">Error: {error}</p>}

        <div className="relative w-full h-[600px] border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
          {/* Dynamic Screenshot Background from Supabase Storage */}
          {screenshotUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imageKey}
              src={screenshotUrl}
              alt={`Screenshot of ${pagePath}`}
              className="absolute inset-0 w-full h-full object-contain"
              onError={(e) => {
                console.warn(`Screenshot not found: ${screenshotUrl}`);
                e.currentTarget.style.display = "none";
              }}
              onLoad={(e) => (e.currentTarget.style.display = "block")}
            />
          )}

          {/* Heatmap overlay (this div must be on top) */}
          <div
            ref={heatmapContainerRef}
            className="absolute inset-0 w-full h-full z-10"
          ></div>

          {/* Text to show if no heatmap data */}
          {!loadingData &&
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
