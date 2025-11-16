"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import h337 from "heatmap.js";
import { createBrowserClient } from "@supabase/ssr";

const SITE_ID = "a2a95f61-1024-40f8-af7e-4c4df2fcbd01";
const CLIENT_DOMAIN = "https://navlens-rho.vercel.app";

// DEFINITIVE SCREENSHOT PROFILES (Keep these)
const DEVICE_PROFILES = {
  desktop: { width: 1440, height: 1080, name: "Desktop", userAgent: "..." },
  tablet: { width: 768, height: 1024, name: "Tablet", userAgent: "..." },
  mobile: { width: 375, height: 667, name: "Mobile", userAgent: "..." },
};

type DeviceType = keyof typeof DEVICE_PROFILES;

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const debounce = (func: (...args: any[]) => void, delay: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export default function HeatmapViewer() {
  const [pagePath, setPagePath] = useState("/");
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>("desktop");
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const screenshotImgRef = useRef<HTMLImageElement>(null);
  const heatmapViewportRef = useRef<HTMLDivElement>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getScreenshotUrl = useCallback(
    (siteId: string, path: string, device: DeviceType) => {
      const filePath = `${siteId}/${
        path === "/" ? "homepage" : path.replace(/^\//, "")
      }-${device}.png`;
      const { data } = supabase.storage
        .from("screenshots")
        .getPublicUrl(filePath);
      return data.publicUrl;
    },
    [selectedDevice]
  );

  const fetchHeatmapData = useCallback(
    async (path: string, deviceType: DeviceType) => {
      setLoadingData(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/heatmap-clicks?siteId=${SITE_ID}&pagePath=${encodeURIComponent(
            path
          )}&deviceType=${deviceType}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.data || [];
      } catch (err: Error | unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to fetch heatmap data: ${errorMsg}`);
        return [];
      } finally {
        setLoadingData(false);
      }
    },
    [selectedDevice]
  );

  const handleRefreshScreenshot = async () => {
    setLoadingScreenshot(true);
    setError(null);
    setImageLoaded(false);

    const pageUrlToScreenshot = CLIENT_DOMAIN + pagePath;

    try {
      const response = await fetch("/api/generate-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageUrlToScreenshot,
          siteId: SITE_ID,
          pagePath,
          deviceType: selectedDevice,
          userAgent: DEVICE_PROFILES[selectedDevice].userAgent,
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

  const renderHeatmapData = useCallback(async () => {
    if (
      !heatmapInstance ||
      !screenshotImgRef.current ||
      !heatmapContainerRef.current ||
      !heatmapViewportRef.current
    ) {
      console.warn("renderHeatmapData: Refs or instance not ready.");
      return;
    }

    const viewportElement = heatmapViewportRef.current;

    // Use the actual image dimensions, which should equal the container's width,
    // and the height is auto-calculated due to height: auto.
    const actualDisplayedWidth = screenshotImgRef.current.offsetWidth;
    const actualDisplayedHeight = screenshotImgRef.current.offsetHeight;

    if (actualDisplayedWidth === 0 || actualDisplayedHeight === 0) {
      setTimeout(renderHeatmapData, 100);
      return;
    }

    // Set the heatmap canvas dimensions to exactly match the rendered image
    heatmapInstance._renderer.setDimensions(
      Math.round(actualDisplayedWidth),
      Math.round(actualDisplayedHeight)
    );

    const rawData = await fetchHeatmapData(pagePath, selectedDevice);
    if (!rawData || rawData.length === 0) {
      heatmapInstance.setData({ min: 0, max: 1, data: [] });
      return;
    }

    // Map data: Percentages (x_relative) are mapped directly to the displayed pixels
    const heatmapData = rawData.map(
      (d: { x_relative: number; y_relative: number; count: number }) => ({
        x: Math.round(d.x_relative * actualDisplayedWidth),
        y: Math.round(d.y_relative * actualDisplayedHeight),
        value: d.count,
      })
    );

    const maxCount = Math.max(
      ...heatmapData.map((d: { value: number }) => d.value),
      1
    );
    heatmapInstance.setData({ min: 0, max: maxCount, data: heatmapData });

    // --- CRITICAL: Apply Final Canvas Sizing ---
    const canvasElement = heatmapContainerRef.current?.querySelector("canvas");
    if (canvasElement) {
      canvasElement.style.position = "absolute";
      canvasElement.style.left = `0px`;
      canvasElement.style.top = `0px`;
      canvasElement.style.width = `${Math.round(actualDisplayedWidth)}px`;
      canvasElement.style.height = `${Math.round(actualDisplayedHeight)}px`;
      canvasElement.style.zIndex = "100";
    }
  }, [heatmapInstance, pagePath, selectedDevice, fetchHeatmapData]);

  const debouncedRenderHeatmap = useCallback(debounce(renderHeatmapData, 150), [
    renderHeatmapData,
  ]);

  // --- Initialize Heatmap.js instance once ---
  useEffect(() => {
    if (heatmapContainerRef.current && !heatmapInstance) {
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
  }, [heatmapInstance]);

  // --- Load initial screenshot when pagePath changes ---
  useEffect(() => {
    if (!pagePath) return;
    const url = getScreenshotUrl(SITE_ID, pagePath, selectedDevice);
    setScreenshotUrl(`${url}?t=${new Date().getTime()}`);
    setImageLoaded(false); // Hide image until new one loads
    heatmapInstance?.setData({ min: 0, max: 1, data: [] }); // Clear old heatmap
  }, [pagePath, selectedDevice, getScreenshotUrl, heatmapInstance]);

  // --- Trigger initial heatmap render when instance and image are ready ---
  useEffect(() => {
    if (heatmapInstance && imageLoaded && screenshotImgRef.current) {
      debouncedRenderHeatmap();
    }
  }, [heatmapInstance, imageLoaded, selectedDevice, debouncedRenderHeatmap]);

  // --- Handle image load event ---
  const handleImageLoad = () => {
    setTimeout(() => {
      setImageLoaded(true);
      debouncedRenderHeatmap();
    }, 50);
  };

  // --- Resize Observer ---
  useEffect(() => {
    if (!heatmapViewportRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (imageLoaded) {
        debouncedRenderHeatmap();
      }
    });
    const currentRef = heatmapViewportRef.current;
    resizeObserver.observe(currentRef);
    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
    };
  }, [imageLoaded, debouncedRenderHeatmap]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Head>
        <title>Heatmap Viewer</title>
      </Head>

      <main className="container mx-auto bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Heatmap Viewer</h1>

        {/* --- CONTROLS --- */}
        <div className="flex justify-between items-center mb-4 gap-4">
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
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device:
              </label>
              <div className="flex gap-2">
                {Object.entries(DEVICE_PROFILES).map(([key, profile]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDevice(key as DeviceType)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      selectedDevice === key
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleRefreshScreenshot}
              disabled={loadingScreenshot}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 h-fit"
            >
              {loadingScreenshot ? "Refreshing..." : "Refresh Screenshot"}
            </button>
          </div>
        </div>

        {/* --- STATUS MESSAGES --- */}
        {loadingData && (
          <p className="text-blue-500">Loading heatmap data...</p>
        )}
        {error && <p className="text-red-500">Error: {error}</p>}

        {/* Full-width viewport with fixed height and vertical scrolling */}
        <div
          ref={heatmapViewportRef}
          className="relative w-full mx-auto border border-gray-300 bg-gray-50"
          style={{
            width: `${DEVICE_PROFILES[selectedDevice].width}px`,
            height: "600px", // Fixed viewer height
            maxWidth: "100%", // Allow it to shrink on small screens
            overflowY: "scroll", // Allow vertical scrolling
            overflowX: "hidden", // Prevent horizontal scrolling
            position: "relative", // CRITICAL for inner absolute elements
          }}
        >
          {/* Screenshot Image */}
          {screenshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={screenshotImgRef}
              src={screenshotUrl}
              alt={`Screenshot of ${pagePath}`}
              className="w-full h-auto transition-opacity duration-300" // w-full ensures horizontal fit
              onLoad={handleImageLoad}
              onError={() => {
                setImageLoaded(false);
                heatmapInstance?.setData({ min: 0, max: 1, data: [] });
                setError(`Failed to load screenshot: Failed to load image.`);
              }}
              style={{
                opacity: imageLoaded ? 1 : 0,
                pointerEvents: "none",
                zIndex: 5,
                position: "absolute", // CRITICAL: Absolute position for stacking
                top: 0,
                left: 0,
                width: "100%",
                height: "auto", // Allows image to be taller than viewport
              }}
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center z-0 text-gray-400 text-lg">
              No screenshot available. Click "Refresh Screenshot".
            </p>
          )}

          {/* Heatmap overlay container */}
          <div
            ref={heatmapContainerRef}
            className="absolute top-0 left-0 w-full h-auto z-10 transition-opacity duration-300"
            style={{
              opacity: imageLoaded ? 1 : 0,
              pointerEvents: "none",
              // We will set the height dynamically in renderHeatmapData to match the image's height
            }}
          ></div>

          {/* Text to show if no heatmap data */}
          {!loadingData &&
            !error &&
            imageLoaded &&
            heatmapInstance &&
            heatmapInstance.getData?.()?.data?.length === 0 && (
              <p className="absolute inset-0 flex items-center justify-center z-20 text-gray-500 text-lg">
                No heatmap data available for this page/period.
              </p>
            )}
        </div>
      </main>
    </div>
  );
}

const pagePaths = ["/", "/dashboard", "/contact"];
