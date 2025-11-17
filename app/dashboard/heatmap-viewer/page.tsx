"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import h337 from "heatmap.js";
import { createBrowserClient } from "@supabase/ssr";
import { useSite } from "@/app/context/SiteContext";
import ProgressBar from "@/components/ProgressBar";

interface SmartElement {
  tag: string;
  text: string;
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

// --- Type Definitions ---

interface DebounceFunction<T extends unknown[]> {
  (...args: T): void;
}

const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  delay: number
): DebounceFunction<T> => {
  let timeout: NodeJS.Timeout;
  return (...args: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

export default function HeatmapViewer() {
  const { selectedSiteId: siteId } = useSite();

  const [pagePaths, setPagePaths] = useState<string[]>([]);
  const [pagePath, setPagePath] = useState("/");
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>("desktop");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null); // heatmap.js instance
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const screenshotImgRef = useRef<HTMLImageElement>(null);
  const heatmapViewportRef = useRef<HTMLDivElement>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [siteIdError, setSiteIdError] = useState<string | null>(null);
  const imageLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- NEW STATE: Smart Elements ---
  const [smartElements, setSmartElements] = useState<SmartElement[]>([]);
  const [showSmartMap, setShowSmartMap] = useState(false); // Toggle for the new view

  // Validate siteId on mount
  useEffect(() => {
    if (!siteId) {
      setSiteIdError(
        "No site selected. Please select a site from the My Sites page."
      );
    } else {
      setSiteIdError(null);
    }
  }, [siteId]);

  // Fetch page paths dynamically
  useEffect(() => {
    if (!siteId) return;

    const fetchPagePaths = async () => {
      try {
        const response = await fetch(`/api/get-pages-list?siteId=${siteId}`);
        if (!response.ok) throw new Error("Failed to fetch page paths");
        const data = await response.json();
        console.log("[heatmap-viewer] Fetched page paths:", data.pagePaths);
        if (data.pagePaths && data.pagePaths.length > 0) {
          setPagePaths(data.pagePaths);
          console.log("[heatmap-viewer] Setting page paths:", data.pagePaths);
          // Set first page path as default only on initial load
          setPagePath((prev) => {
            const nextPath = prev === "/" ? data.pagePaths[0] : prev;
            console.log(
              "[heatmap-viewer] Page path change:",
              prev,
              "->",
              nextPath
            );
            return nextPath;
          });
        } else {
          // Fallback to default paths if no pages found
          console.log("[heatmap-viewer] No page paths found, using fallback");
          setPagePaths(["/", "/dashboard", "/contact"]);
        }
      } catch (err) {
        console.error("Error fetching page paths:", err);
        // Fallback to default paths on error
        setPagePaths(["/", "/dashboard", "/contact"]);
      }
    };

    fetchPagePaths();
  }, [siteId]);

  // Detect if viewing on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);

      // Force mobile device selection on mobile screens
      if (mobile && selectedDevice !== "mobile") {
        setSelectedDevice("mobile");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [selectedDevice]);
  const getScreenshotUrl = useCallback(
    (currentSiteId: string | null, path: string, device: DeviceType) => {
      if (!currentSiteId) return "";

      // Normalize path for screenshot filename
      let normalizedPath: string;
      if (path === "/") {
        normalizedPath = "homepage";
      } else if (path.startsWith("/")) {
        normalizedPath = path.slice(1); // Remove leading slash
      } else if (path.startsWith(".")) {
        normalizedPath = path.slice(1); // Remove leading dot
      } else {
        normalizedPath = path;
      }

      const filePath = `${currentSiteId}/${normalizedPath}-${device}.png`;
      const { data } = supabase.storage
        .from("screenshots")
        .getPublicUrl(filePath);
      return data.publicUrl;
    },
    []
  );

  // --- NEW: Helper for Storage URLs (Screenshot + JSON Map) ---
  const getStorageUrls = useCallback(
    (siteId: string, path: string, device: DeviceType) => {
      // Normalize path for filename (match backend API)
      let normalizedPath: string;
      if (path === "/") {
        normalizedPath = "homepage";
      } else if (path.startsWith("/")) {
        normalizedPath = path.slice(1); // Remove leading slash
      } else if (path.startsWith(".")) {
        normalizedPath = path.slice(1); // Remove leading dot
      } else {
        normalizedPath = path;
      }

      const basePath = `${siteId}/${normalizedPath}-${device}`;
      return {
        image: supabase.storage
          .from("screenshots")
          .getPublicUrl(`${basePath}.png`).data.publicUrl,
        json: supabase.storage
          .from("screenshots")
          .getPublicUrl(`${basePath}.json`).data.publicUrl,
      };
    },
    []
  );

  // --- NEW: Fetch Smart Map Data ---
  const fetchSmartMap = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("No smart map found");
      const data = await res.json();
      console.log("[Smart Map] Loaded elements:", data);
      setSmartElements(data);
    } catch (e) {
      console.warn("[Smart Map] Could not load element map:", e);
      setSmartElements([]);
    }
  };

  const fetchHeatmapData = useCallback(
    async (path: string, deviceType: DeviceType) => {
      if (!siteId) return [];
      setLoadingData(true);
      setError(null);
      try {
        const url = `/api/heatmap-clicks?siteId=${siteId}&pagePath=${encodeURIComponent(
          path
        )}&deviceType=${deviceType}`;
        console.log("[fetchHeatmapData] Fetching from URL:", url);
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log(
          "[fetchHeatmapData] Response data for path",
          path,
          ":",
          data
        );
        return data.data || [];
      } catch (err: Error | unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("[fetchHeatmapData] Error:", errorMsg);
        setError(`Failed to fetch heatmap data: ${errorMsg}`);
        return [];
      } finally {
        setLoadingData(false);
      }
    },
    [siteId]
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
          siteId: siteId,
          pagePath,
          deviceType: selectedDevice,
          userAgent: DEVICE_PROFILES[selectedDevice].userAgent,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate preview");
      }
      const { publicUrl } = await response.json();

      // Force reload by appending timestamp
      const timestamp = new Date().getTime();
      setScreenshotUrl(`${publicUrl}?t=${timestamp}`);

      // Fetch smart map data too
      const urls = getStorageUrls(siteId!, pagePath, selectedDevice);
      fetchSmartMap(`${urls.json}?t=${timestamp}`);
    } catch (err: Error | unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoadingScreenshot(false);
    }
  };

  const renderHeatmapData = useCallback(async () => {
    console.log(
      "[renderHeatmapData] Called with pagePath:",
      pagePath,
      "selectedDevice:",
      selectedDevice
    );
    if (
      !heatmapInstance ||
      !screenshotImgRef.current ||
      !heatmapContainerRef.current ||
      !heatmapViewportRef.current
    ) {
      console.warn("renderHeatmapData: Refs or instance not ready.");
      return;
    }

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

  const debouncedRenderHeatmap = useCallback(
    () => debounce(renderHeatmapData, 150)(),
    [renderHeatmapData]
  );

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
    if (!pagePath || !siteId) return;

    // Clear any existing timeout when loading new screenshot
    if (imageLoadTimeoutRef.current) {
      clearTimeout(imageLoadTimeoutRef.current);
      imageLoadTimeoutRef.current = null;
    }

    const url = getScreenshotUrl(siteId, pagePath, selectedDevice);
    setScreenshotUrl(`${url}?t=${new Date().getTime()}`);
    setImageLoaded(false); // Hide image until new one loads
    setError(null); // Clear any previous error
    heatmapInstance?.setData({ min: 0, max: 1, data: [] }); // Clear old heatmap

    // Fetch smart map data too
    const urls = getStorageUrls(siteId, pagePath, selectedDevice);
    fetchSmartMap(urls.json);

    // Set timeout for the new image - but shorter for first load (no screenshot exists yet)
    // After 5 seconds, if still not loaded, show "no screenshot" message instead of error
    console.log("Setting timeout for screenshot load");
    imageLoadTimeoutRef.current = setTimeout(() => {
      console.log("Screenshot load timeout fired");
      setError(
        "No preview available for this page yet. Click 'Refresh Preview' to generate one."
      );
      // Force hide the loading spinner
      setImageLoaded(true);
    }, 5000); // Shorter 5-second timeout for better UX
  }, [
    pagePath,
    selectedDevice,
    siteId,
    getScreenshotUrl,
    getStorageUrls,
    heatmapInstance,
  ]);

  // --- Trigger initial heatmap render when instance and image are ready ---
  useEffect(() => {
    if (heatmapInstance && imageLoaded && screenshotImgRef.current) {
      debouncedRenderHeatmap();
    }
  }, [
    heatmapInstance,
    imageLoaded,
    debouncedRenderHeatmap,
    pagePath,
    selectedDevice,
  ]);

  // --- Handle image load event ---
  const handleImageLoad = () => {
    console.log("Image loaded successfully - clearing timeout");
    // Clear any pending timeout IMMEDIATELY
    if (imageLoadTimeoutRef.current) {
      clearTimeout(imageLoadTimeoutRef.current);
      imageLoadTimeoutRef.current = null;
    }
    // Set imageLoaded immediately without setTimeout delay
    setImageLoaded(true);
    // Debounce the heatmap rendering
    setTimeout(() => {
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-slate-50 p-3 sm:p-6">
      <Head>
        <title>Heatmap Viewer - NavLens Analytics</title>
      </Head>

      {/* Error state when no siteId is provided */}
      {siteIdError ? (
        <main className="container mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 md:p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-800">
                  No Site Selected
                </h1>
                <p className="text-gray-600 text-lg">{siteIdError}</p>
              </div>

              <a
                href="/dashboard/my-sites"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Go to My Sites
              </a>
            </div>
          </div>
        </main>
      ) : (
        <main className="container mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
          {/* Header Section */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Smart Heatmap Viewer (v2.0)
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Visualize user interactions and detect interactive elements on
                  your website
                </p>
              </div>
            </div>
          </div>

          {/* Loading spinners */}
          {loadingData && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
                <div className="flex flex-col items-center gap-5">
                  {/* Windows 11 loading animation */}
                  <div className="relative w-14 h-14">
                    <style>{`
                      @keyframes win11Spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      .win11Loader {
                        animation: win11Spin 1.2s linear infinite;
                      }
                    `}</style>

                    {/* Background ring */}
                    <svg
                      className="absolute inset-0"
                      width="56"
                      height="56"
                      viewBox="0 0 56 56"
                      fill="none"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180);
                        const x = 28 + 20 * Math.cos(angle);
                        const y = 28 + 20 * Math.sin(angle);
                        return (
                          <circle
                            key={`bg-${i}`}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill="rgba(200, 210, 220, 0.3)"
                          />
                        );
                      })}
                    </svg>

                    {/* Animated ring */}
                    <svg
                      className="absolute inset-0 win11Loader"
                      width="56"
                      height="56"
                      viewBox="0 0 56 56"
                      fill="none"
                    >
                      {[0, 1, 2, 3].map((i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180);
                        const x = 28 + 20 * Math.cos(angle);
                        const y = 28 + 20 * Math.sin(angle);
                        const opacity = 1 - i * 0.25;
                        return (
                          <circle
                            key={`active-${i}`}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill={`rgba(59, 130, 246, ${opacity})`}
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-gray-700 font-semibold">
                      Loading heatmap data
                    </p>
                    <p className="text-gray-500 text-sm">Please wait...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loadingScreenshot && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md">
                <div className="flex flex-col items-center gap-6">
                  <ProgressBar isVisible={loadingScreenshot} />
                </div>
              </div>
            </div>
          )}

          {/* Loading spinner for image rendering - appears inside viewport while image loads */}
          {screenshotUrl && !imageLoaded && !error && !loadingScreenshot && (
            <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
                <div className="flex flex-col items-center gap-5">
                  {/* Windows 11 loading animation */}
                  <div className="relative w-14 h-14">
                    <style>{`
                      @keyframes win11Spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                      .win11Loader {
                        animation: win11Spin 1.2s linear infinite;
                      }
                    `}</style>

                    {/* Background ring */}
                    <svg
                      className="absolute inset-0"
                      width="56"
                      height="56"
                      viewBox="0 0 56 56"
                      fill="none"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180);
                        const x = 28 + 20 * Math.cos(angle);
                        const y = 28 + 20 * Math.sin(angle);
                        return (
                          <circle
                            key={`bg-${i}`}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill="rgba(200, 210, 220, 0.3)"
                          />
                        );
                      })}
                    </svg>

                    {/* Animated ring */}
                    <svg
                      className="absolute inset-0 win11Loader"
                      width="56"
                      height="56"
                      viewBox="0 0 56 56"
                      fill="none"
                    >
                      {[0, 1, 2, 3].map((i) => {
                        const angle = (i * 45 - 90) * (Math.PI / 180);
                        const x = 28 + 20 * Math.cos(angle);
                        const y = 28 + 20 * Math.sin(angle);
                        const opacity = 1 - i * 0.25;
                        return (
                          <circle
                            key={`active-${i}`}
                            cx={x}
                            cy={y}
                            r="2.5"
                            fill={`rgba(59, 130, 246, ${opacity})`}
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-gray-700 font-semibold">Loading image</p>
                    <p className="text-gray-500 text-sm">
                      Rendering your screenshot...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- CONTROLS --- */}
          <div className="bg-linear-to-r from-slate-50 to-blue-50 rounded-xl p-4 sm:p-6 mb-12 border border-gray-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              {/* Page Selection */}
              <div className="flex-1">
                <label
                  htmlFor="pagePathSelect"
                  className="block text-sm font-semibold text-slate-700 mb-4"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    Select Page
                  </span>
                </label>
                <select
                  id="pagePathSelect"
                  className="block w-full md:w-1/2 pl-4 pr-10 py-2.5 text-base border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white shadow-sm transition-all"
                  value={pagePath}
                  onChange={(e) => setPagePath(e.target.value)}
                >
                  {pagePaths.map((path) => (
                    <option key={path} value={path}>
                      {path === "/" ? "/homepage" : path}
                    </option>
                  ))}
                </select>
              </div>
              {/* Device Selection */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    Device Type
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DEVICE_PROFILES).map(([key, profile]) => {
                    // Hide desktop/tablet buttons on mobile - only show mobile option
                    if (isMobile && key !== "mobile") {
                      return null;
                    }

                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDevice(key as DeviceType)}
                        disabled={isMobile && key !== "mobile"}
                        className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                          selectedDevice === key
                            ? "bg-blue-600 text-white shadow-md scale-105"
                            : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300"
                        } ${isMobile && key !== "mobile" ? "hidden" : ""}`}
                      >
                        {profile.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Capture Live Preview
                  </span>
                </label>
                <button
                  onClick={handleRefreshScreenshot}
                  disabled={loadingScreenshot}
                  className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-md hover:shadow-lg font-semibold flex items-center justify-center gap-2 min-w-[180px]"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {loadingScreenshot ? "Refreshing..." : "Refresh Preview"}
                </button>
              </div>
            </div>

            {/* Smart Elements Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Smart Elements
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Highlight interactive elements detected on the page
                  </p>
                </div>
                <button
                  onClick={() => setShowSmartMap(!showSmartMap)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                    showSmartMap
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300"
                  }`}
                >
                  {showSmartMap ? "Hide Elements" : "Show Elements"}
                </button>
              </div>
            </div>
          </div>

          {/* --- STATUS MESSAGES --- */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Full-width viewport with fixed height and vertical scrolling */}
          <div
            ref={heatmapViewportRef}
            className="relative w-full mx-auto border-2 border-gray-300 bg-gray-50 rounded-lg shadow-lg overflow-hidden"
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
                  // Clear timeout on error
                  if (imageLoadTimeoutRef.current) {
                    clearTimeout(imageLoadTimeoutRef.current);
                    imageLoadTimeoutRef.current = null;
                  }
                  setImageLoaded(true); // Hide spinner
                  heatmapInstance?.setData({ min: 0, max: 1, data: [] });
                  // Show user-friendly message for 404 (no screenshot yet)
                  setError(
                    "No preview available for this page yet. Click 'Capture Live Preview' to generate one."
                  );
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
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <div className="text-center space-y-3 p-8">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500 font-medium text-lg">
                    No preview available
                  </p>
                  <p className="text-gray-400 text-sm">
                    Click &quot;Refresh Preview&quot; to capture your page
                  </p>
                </div>
              </div>
            )}

            {/* Heatmap overlay container - Only show for current device */}
            {((isMobile && selectedDevice === "mobile") ||
              (!isMobile &&
                (selectedDevice === "desktop" ||
                  selectedDevice === "tablet"))) && (
              <div
                ref={heatmapContainerRef}
                className="absolute top-0 left-0 w-full h-auto z-10 transition-opacity duration-300"
                style={{
                  opacity: imageLoaded ? 1 : 0,
                  pointerEvents: "none",
                }}
              ></div>
            )}

            {/* --- Smart Elements Overlay (v2.0 Feature) --- */}
            {showSmartMap && imageLoaded && smartElements.length > 0 && (
              <div className="absolute top-0 left-0 w-full h-auto z-20 pointer-events-none">
                {smartElements.map((el: SmartElement, i: number) => {
                  // Calculate scaling based on current displayed width vs original screenshot width
                  // We assume the image takes up 100% of the container width
                  const currentWidth =
                    heatmapViewportRef.current?.offsetWidth ||
                    DEVICE_PROFILES[selectedDevice].width;
                  const scale =
                    currentWidth / DEVICE_PROFILES[selectedDevice].width;

                  return (
                    <div
                      key={i}
                      title={`${el.tag}: ${el.text}\nSelector: ${el.selector}`}
                      className="absolute border-2 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500 transition-all duration-200 rounded-sm pointer-events-auto"
                      style={{
                        // Scale the coordinates from the JSON to match the current view
                        left: `${el.x * scale}px`,
                        top: `${el.y * scale}px`,
                        width: `${el.width * scale}px`,
                        height: `${el.height * scale}px`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(
                          `Smart Element Detected:\n\nTag: ${el.tag}\nText: "${el.text}"\nSelector: ${el.selector}\nPosition: ${el.x}, ${el.y}\nSize: ${el.width} × ${el.height}px`
                        );
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgb(59 130 246 / 0.8)";
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgb(59 130 246 / 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgb(59 130 246 / 0.4)";
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgb(59 130 246 / 0.1)";
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Hide heatmap overlay for wrong device on mobile */}
            {isMobile && selectedDevice !== "mobile" && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-yellow-50/95 backdrop-blur-sm">
                <div className="text-center space-y-2 p-6">
                  <svg
                    className="w-12 h-12 text-yellow-600 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className="text-yellow-700 font-semibold">Limited View</p>
                  <p className="text-yellow-600 text-sm">
                    Heatmap only available for Mobile view on this device
                  </p>
                </div>
              </div>
            )}

            {/* Text to show if no heatmap data */}
            {!loadingData &&
              !error &&
              imageLoaded &&
              heatmapInstance &&
              heatmapInstance.getData?.()?.data?.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/80 backdrop-blur-sm">
                  <div className="text-center space-y-3 p-8">
                    <svg
                      className="w-16 h-16 text-gray-400 mx-auto"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <div>
                      <p className="text-gray-600 font-semibold text-lg">
                        No heatmap data available
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        There are no interactions recorded for this page yet
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </main>
      )}
    </div>
  );
}
