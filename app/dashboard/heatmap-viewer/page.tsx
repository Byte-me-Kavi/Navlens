"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import h337 from "heatmap.js";
import { createBrowserClient } from "@supabase/ssr";

const SITE_ID = "a2a95f61-1024-40f8-af7e-4c4df2fcbd01";
const CLIENT_DOMAIN = "https://navlens-rho.vercel.app";
const SCREENSHOT_WIDTH = 1920;
const SCREENSHOT_HEIGHT = 1080;

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Debounce utility
const debounce = (func: (...args: any[]) => void, delay: number) => {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export default function HeatmapViewer() {
  const [pagePath, setPagePath] = useState("/");
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const screenshotImgRef = useRef<HTMLImageElement>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [imageVisible, setImageVisible] = useState(false); // Used for opacity control

  // --- Helper to get the predictable screenshot URL ---
  const getScreenshotUrl = useCallback((siteId: string, path: string) => {
    const filePath = `${siteId}/${
      path === "/" ? "homepage" : path.replace(/^\//, "")
    }.png`;
    const { data } = supabase.storage
      .from("screenshots")
      .getPublicUrl(filePath);
    return data.publicUrl;
  }, []);

  // --- Fetch Heatmap Data ---
  const fetchHeatmapData = useCallback(async (path: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/heatmap-clicks?siteId=${SITE_ID}&pagePath=${encodeURIComponent(
          path
        )}`
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log("Fetched heatmap data response:", data);

      // ClickHouse returns data in different formats depending on the client library
      // Try multiple possible structures
      const heatmapArray = data.data || data.result || data || [];
      console.log("Extracted heatmap array:", heatmapArray);

      return Array.isArray(heatmapArray) ? heatmapArray : [];
    } catch (err: Error | unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch heatmap data:", err);
      setError(`Failed to fetch heatmap data: ${errorMsg}`);
      return [];
    } finally {
      setLoadingData(false);
    }
  }, []);

  // --- Handler for the "Refresh Screenshot" button ---
  const handleRefreshScreenshot = async () => {
    setLoadingScreenshot(true);
    setError(null);
    setImageVisible(false); // Hide image and heatmap while loading new one

    const pageUrlToScreenshot = CLIENT_DOMAIN + pagePath;
    console.log("Frontend preparing screenshot request:", {
      pageUrlToScreenshot,
      SITE_ID,
      pagePath,
    });

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
      setScreenshotUrl(`${publicUrl}?t=${new Date().getTime()}`);
    } catch (err: Error | unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoadingScreenshot(false);
    }
  };

  // --- The Core Heatmap Rendering Function ---
  const renderHeatmapData = useCallback(async () => {
    if (
      !heatmapInstance ||
      !screenshotImgRef.current ||
      !heatmapContainerRef.current
    ) {
      console.warn("renderHeatmapData: Refs or instance not ready.");
      return;
    }

    const imgElement = screenshotImgRef.current;
    const containerElement = heatmapContainerRef.current;

    // Get actual displayed dimensions of the image
    const displayedWidth = imgElement.offsetWidth;
    const displayedHeight = imgElement.offsetHeight;

    // CRITICAL: The image uses object-contain, so it maintains aspect ratio
    // We need to calculate the actual visible image dimensions within the container
    const imageAspectRatio = SCREENSHOT_WIDTH / SCREENSHOT_HEIGHT;
    const containerAspectRatio = displayedWidth / displayedHeight;

    let actualImageWidth, actualImageHeight;
    
    if (containerAspectRatio > imageAspectRatio) {
      // Container is wider - image is limited by height
      actualImageHeight = displayedHeight;
      actualImageWidth = displayedHeight * imageAspectRatio;
    } else {
      // Container is taller - image is limited by width
      actualImageWidth = displayedWidth;
      actualImageHeight = displayedWidth / imageAspectRatio;
    }

    console.log(
      `Rendering heatmap - Container: ${displayedWidth}x${displayedHeight}, Actual image: ${Math.round(actualImageWidth)}x${Math.round(actualImageHeight)}`
    );

    // Set the heatmap canvas dimensions to match the ACTUAL visible image
    heatmapInstance._renderer.setDimensions(
      Math.round(actualImageWidth),
      Math.round(actualImageHeight)
    );

    const rawData = await fetchHeatmapData(pagePath);

    if (!rawData || rawData.length === 0) {
      console.log("No raw heatmap data, clearing heatmap.");
      heatmapInstance.setData({ min: 0, max: 1, data: [] });
      return;
    }

    console.log(`Processing ${rawData.length} raw heatmap data points`);

    const heatmapData = rawData.map(
      (d: { x_bin: number; y_bin: number; count: number }) => {
        const transformedPoint = {
          x: Math.round((d.x_bin / 100) * actualImageWidth),
          y: Math.round((d.y_bin / 100) * actualImageHeight),
          value: d.count,
        };
        console.log(
          `Data point: x_bin=${d.x_bin}, y_bin=${d.y_bin}, count=${d.count} => x=${transformedPoint.x}, y=${transformedPoint.y}`
        );
        return transformedPoint;
      }
    );

    const maxCount = Math.max(
      ...heatmapData.map((d: { value: number }) => d.value),
      1
    );

    console.log(
      "Setting heatmap data with max:",
      maxCount,
      "points:",
      heatmapData
    );
    heatmapInstance.setData({
      min: 0,
      max: maxCount,
      data: heatmapData,
    });
  }, [heatmapInstance, pagePath, fetchHeatmapData]);

  // Debounced version
  const debouncedRenderHeatmap = useCallback(debounce(renderHeatmapData, 150), [
    renderHeatmapData,
  ]);

  // --- Initialize Heatmap.js instance once ---
  useEffect(() => {
    if (heatmapContainerRef.current && !heatmapInstance) {
      console.log("Initializing heatmap.js instance.");
      // Clear container in case of hot-reload artifacts
      while (heatmapContainerRef.current.firstChild) {
        heatmapContainerRef.current.removeChild(
          heatmapContainerRef.current.firstChild
        );
      }
      const instance = h337.create({
        container: heatmapContainerRef.current,
        radius: 30,
        maxOpacity: 0.7,
        minOpacity: 0.1,
        blur: 0.85,
        gradient: {
          "0.0": "rgba(0, 0, 255, 0)",
          "0.2": "rgba(0, 150, 255, 0.5)",
          "0.4": "rgba(0, 255, 255, 0.6)",
          "0.6": "rgba(0, 255, 0, 0.7)",
          "0.8": "rgba(255, 255, 0, 0.8)",
          "1.0": "rgba(255, 0, 0, 0.9)",
        },
      });
      setHeatmapInstance(instance);
    }
  }, [heatmapInstance]); // Only run once when instance is null

  // --- Load initial screenshot when pagePath changes ---
  useEffect(() => {
    if (!pagePath) return;
    console.log(`pagePath changed to: ${pagePath}. Loading screenshot.`);
    const url = getScreenshotUrl(SITE_ID, pagePath);
    setScreenshotUrl(`${url}?t=${new Date().getTime()}`);
    setImageVisible(false); // Hide until new image loads
    heatmapInstance?.setData({ min: 0, max: 1, data: [] }); // Clear old heatmap
  }, [pagePath, getScreenshotUrl, heatmapInstance]);

  // --- Trigger initial heatmap render when instance and image are ready ---
  useEffect(() => {
    if (heatmapInstance && imageVisible && screenshotImgRef.current) {
      console.log(
        "Heatmap instance and image are ready, rendering heatmap data."
      );
      renderHeatmapData();
    }
  }, [heatmapInstance, imageVisible, renderHeatmapData]);

  // --- Handle image load event ---
  const handleImageLoad = () => {
    console.log("Screenshot image load event fired.");
    setImageVisible(true); // Now the image is loaded, make it and heatmap visible
    debouncedRenderHeatmap(); // Render the heatmap after a short delay
  };

  // --- Resize Observer ---
  useEffect(() => {
    if (!heatmapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      console.log(
        "ResizeObserver: Heatmap container resized, triggering render."
      );
      // Only re-render if image is currently visible, otherwise it's still loading
      if (imageVisible) {
        debouncedRenderHeatmap();
      }
    });
    // Observe the parent container (which controls the overall sizing)
    const parentContainer = heatmapContainerRef.current.parentElement;
    if (parentContainer) {
      resizeObserver.observe(parentContainer);
    }
    return () => {
      if (parentContainer) {
        resizeObserver.unobserve(parentContainer);
      }
    };
  }, [imageVisible, debouncedRenderHeatmap]); // Re-run if imageVisible changes to ensure correct behavior

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Head>
        <title>Heatmap Viewer</title>
      </Head>

      <main className="container mx-auto bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Heatmap Viewer</h1>

        {/* --- CONTROLS --- */}
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
              onChange={(e) => setPagePath(e.target.value)}
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

        {/* --- STATUS MESSAGES --- */}
        {loadingData && (
          <p className="text-blue-500">Loading heatmap data...</p>
        )}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* --- HEATMAP CONTAINER --- */}
        <div
          className="relative w-full max-w-[1920px] mx-auto border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden"
          // This padding-top maintains the aspect ratio of the screenshot container
          style={{
            paddingTop: `${(SCREENSHOT_HEIGHT / SCREENSHOT_WIDTH) * 100}%`,
          }}
        >
          {/* Screenshot Image */}
          {screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={screenshotImgRef}
              src={screenshotUrl}
              alt={`Screenshot of ${pagePath}`}
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
              onLoad={handleImageLoad}
              onError={(e) => {
                console.warn(`Screenshot not found: ${screenshotUrl}`);
                setImageVisible(false); // Hide heatmap if image fails to load
                heatmapInstance?.setData({ min: 0, max: 1, data: [] }); // Clear heatmap
                setError(`Failed to load screenshot: ${e.currentTarget.src}`);
              }}
              style={{
                opacity: imageVisible ? 1 : 0,
                pointerEvents: "none", // Prevent image from stealing clicks
                zIndex: 5, // Ensure image is behind heatmap for layering
              }}
            />
          ) : (
            <p className="absolute z-0 text-gray-400 text-lg">
              No screenshot available. Click "Refresh Screenshot".
            </p>
          )}

          {/* Heatmap overlay (this div must be on top) */}
          <div
            ref={heatmapContainerRef}
            className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300"
            style={{
              // Heatmap visibility tied to image being loaded
              opacity: imageVisible ? 1 : 0,
              pointerEvents: "none", // Make heatmap non-interactive
            }}
          ></div>

          {/* Text to show if no heatmap data */}
          {!loadingData &&
            !error &&
            imageVisible && // Only show this if the image is visible
            heatmapInstance &&
            heatmapInstance.getData?.()?.data?.length === 0 && (
              <p className="absolute z-20 text-gray-500 text-lg">
                No heatmap data available for this page/period.
              </p>
            )}
        </div>
      </main>
    </div>
  );
}

// Mock Page Paths
const pagePaths = [
  "/",
  "/dashboard",
  "/products",
  "/contact",
  // Add more pages you want to view
];
