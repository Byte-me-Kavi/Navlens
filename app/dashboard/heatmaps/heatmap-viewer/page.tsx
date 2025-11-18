"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import h337 from "heatmap.js";
import { createBrowserClient } from "@supabase/ssr";
import { useSite } from "@/app/context/SiteContext";
import ProgressBar from "@/components/ProgressBar";
import { useRouter } from "next/navigation";

interface SmartElement {
  tag: string;
  text: string;
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEVICE_PROFILES = {
  desktop: { width: 1465, height: 1060, name: "Desktop", userAgent: "..." },
  tablet: { width: 786, height: 1024, name: "Tablet", userAgent: "..." },
  mobile: { width: 394, height: 667, name: "Mobile", userAgent: "..." },
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
  const router = useRouter();

  console.log("[HeatmapViewer] Component mounted, siteId:", siteId);

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
  const [siteDomain, setSiteDomain] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");
  const [siteIdError, setSiteIdError] = useState<string | null>(null);
  const imageLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- NEW STATE: Smart Elements ---
  const [smartElements, setSmartElements] = useState<SmartElement[]>([]);
  const [showSmartMap, setShowSmartMap] = useState(false); // Toggle for the new view

  // --- NEW STATE: Element Click Data ---
  const [elementClicks, setElementClicks] = useState<{
    [selector: string]: number;
  }>({});
  const [showElementClicks, setShowElementClicks] = useState(true); // Show click counts on elements

  // --- NEW STATE: Element Insights Modal ---
  const [selectedElement, setSelectedElement] = useState<SmartElement | null>(
    null
  );
  const [elementInsights, setElementInsights] = useState<{
    clickCount: number;
    clickPercentage: number;
    totalPageClicks: number;
    rank: number;
    totalElements: number;
  } | null>(null);

  const [mounted, setMounted] = useState(false);

  // Set mounted flag after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate siteId on mount - only after hydration
  useEffect(() => {
    if (!mounted) return;
    if (!siteId) {
      router.push("/dashboard/heatmaps");
      return;
    }
  }, [siteId, router, mounted]);

  // Fetch site details (domain and name)
  useEffect(() => {
    if (!siteId) return;

    const fetchSiteDetails = async () => {
      try {
        // Use POST request to API route to hide siteId from URL
        const response = await fetch("/api/site-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const siteData = await response.json();

        setSiteDomain(siteData.domain);
        setSiteName(siteData.site_name);
        console.log("[heatmap-viewer] Fetched site details:", siteData);
      } catch (error) {
        console.error("[heatmap-viewer] Failed to fetch site details:", error);
        setSiteIdError("Failed to load site details. Please try again.");
      }
    };

    fetchSiteDetails();
  }, [siteId]);

  // Fetch page paths dynamically
  useEffect(() => {
    if (!siteId) return;

    const fetchPagePaths = async () => {
      try {
        // Use POST to hide siteId from URL
        const response = await fetch(`/api/get-pages-list`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        });
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
  const fetchSmartMap = useCallback(
    async (path: string, deviceType: DeviceType) => {
      try {
        console.log("[Smart Map] Fetching smart map for:", {
          siteId,
          path,
          deviceType,
        });

        // Use backend API instead of direct Supabase fetch
        const response = await fetch("/api/smart-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, pagePath: path, deviceType }),
        });

        console.log(
          "[Smart Map] Response status:",
          response.status,
          response.ok
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Smart Map] Error response:", errorText);
          throw new Error(`Failed to fetch smart map: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          "[Smart Map] Raw response data:",
          data,
          "Type:",
          typeof data,
          "IsArray:",
          Array.isArray(data)
        );

        if (Array.isArray(data) && data.length > 0) {
          console.log("[Smart Map] Loaded elements:", data);
          setSmartElements(data);
        } else {
          console.log("[Smart Map] No elements found or empty array");
          setSmartElements([]);
        }
      } catch (e) {
        console.error("[Smart Map] Could not load element map:", e);
        setSmartElements([]);
      }
    },
    [siteId]
  );

  const fetchHeatmapData = useCallback(
    async (path: string, deviceType: DeviceType) => {
      if (!siteId) return [];
      setLoadingData(true);
      setError(null);
      try {
        const response = await fetch("/api/heatmap-clicks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            siteId,
            pagePath: path,
            deviceType,
          }),
        });
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

  const fetchElementClicks = useCallback(
    async (path: string, deviceType: DeviceType) => {
      if (!siteId) return;
      try {
        // Use POST request to hide siteId from URL
        const response = await fetch("/api/element-clicks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            pagePath: path,
            deviceType,
          }),
        });
        console.log("[fetchElementClicks] Fetching element clicks for:", {
          siteId,
          pagePath: path,
          deviceType,
        });
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("[fetchElementClicks] Response data:", data);

        // Transform the data into the expected format: { selector: count }
        const clicksMap: { [selector: string]: number } = {};
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(
            (item: { element_selector: string; click_count: string }) => {
              clicksMap[item.element_selector] = parseInt(item.click_count, 10);
            }
          );
        }
        setElementClicks(clicksMap);
      } catch (err: Error | unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("[fetchElementClicks] Error:", errorMsg);
        setElementClicks({});
      }
    },
    [siteId]
  );

  const calculateElementInsights = (element: SmartElement) => {
    const clickCount = elementClicks[element.selector] || 0;
    const totalPageClicks = Object.values(elementClicks).reduce(
      (sum, count) => sum + count,
      0
    );

    // Calculate rank among clicked elements
    const clickedElements = Object.entries(elementClicks)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);

    const rank =
      clickedElements.findIndex(([selector]) => selector === element.selector) +
      1;
    const clickPercentage =
      totalPageClicks > 0 ? (clickCount / totalPageClicks) * 100 : 0;

    return {
      clickCount,
      clickPercentage,
      totalPageClicks,
      rank,
      totalElements: smartElements.length,
    };
  };

  const openElementInsights = (element: SmartElement) => {
    const insights = calculateElementInsights(element);
    setSelectedElement(element);
    setElementInsights(insights);
  };

  const closeElementInsights = () => {
    setSelectedElement(null);
    setElementInsights(null);
  };

  const handleRefreshScreenshot = async () => {
    setLoadingScreenshot(true);
    setError(null);
    setImageLoaded(false);

    if (!siteDomain) {
      setError("Site domain not loaded. Please try again.");
      setLoadingScreenshot(false);
      return;
    }

    const pageUrlToScreenshot = siteDomain + pagePath;

    try {
      console.log(
        "[Screenshot Request] Starting screenshot generation for:",
        pageUrlToScreenshot
      );
      console.log("[Screenshot Request] Sending to Replit API...");

      // Call Replit API instead of local API
      const response = await fetch(
        "https://4186d157-4183-4c8f-b915-72f12242f634-00-3k6seu7re5d65.pike.replit.dev/api/generate-screenshot",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "cors",
          credentials: "omit",
          body: JSON.stringify({
            pageUrlToScreenshot,
            siteId: siteId,
            pagePath,
            deviceType: selectedDevice,
          }),
        }
      ).catch((fetchError) => {
        console.error("[Screenshot Request] Fetch error:", fetchError.message);
        throw new Error(
          `Network error: ${fetchError.message}. Is the Replit server running?`
        );
      });

      console.log(
        "[Screenshot Response] Status:",
        response.status,
        "OK:",
        response.ok
      );

      if (!response.ok) {
        console.log("[Screenshot Response] Response not ok, parsing error...");
        let err;
        try {
          err = await response.json();
        } catch {
          err = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.log("[Screenshot Response] Error:", err);
        throw new Error(err.error || "Failed to generate preview");
      }

      const data = await response.json();
      console.log("[Screenshot Response] Success! Data:", data);

      // Validate response structure
      if (!data || typeof data !== "object") {
        console.error("[DEBUG] Data is not an object:", data);
        throw new Error("Invalid response format from screenshot service");
      }

      if (data.success !== true) {
        console.error("[DEBUG] Success check failed:", {
          success: data.success,
          type: typeof data.success,
        });
        throw new Error(
          `Screenshot service failed: ${data.error || "Unknown error"}`
        );
      }

      if (!data.publicUrl || typeof data.publicUrl !== "string") {
        console.error("[DEBUG] PublicUrl check failed:", {
          publicUrl: data.publicUrl,
          type: typeof data.publicUrl,
        });
        throw new Error("Invalid or missing publicUrl in response");
      }

      // The Replit API should handle all uploads and return public URLs
      // Update screenshot URL and smart elements from the response
      if (data.publicUrl) {
        // Force reload by appending timestamp
        const timestamp = new Date().getTime();
        setScreenshotUrl(`${data.publicUrl}?t=${timestamp}`);
        console.log("[DEBUG] ✅ Screenshot set successfully");
      }

      // Update smart elements from the response
      setSmartElements(data.elements || []);
      console.log(
        "[DEBUG] ✅ Smart elements updated:",
        data.elements?.length || 0
      );
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

    // Fetch element click data for correlation with smart elements
    await fetchElementClicks(pagePath, selectedDevice);

    // --- CRITICAL: Apply Final Canvas Sizing ---
    const canvasElement = heatmapContainerRef.current?.querySelector("canvas");
    if (canvasElement) {
      console.log(
        "[Canvas Sizing] Setting canvas to:",
        actualDisplayedWidth,
        "x",
        actualDisplayedHeight
      );
      canvasElement.style.position = "absolute";
      canvasElement.style.left = `0px`;
      canvasElement.style.top = `0px`;
      canvasElement.style.width = `${Math.round(actualDisplayedWidth)}px`;
      canvasElement.style.height = `${Math.round(actualDisplayedHeight)}px`;
      canvasElement.style.zIndex = "100";
      canvasElement.style.margin = "0";
      canvasElement.style.padding = "0";
      canvasElement.style.border = "none";
      canvasElement.style.boxSizing = "border-box";
    } else {
      console.log("[Canvas Sizing] Canvas element not found!");
    }

    // Set container height to match image height
    if (heatmapContainerRef.current) {
      console.log(
        "[Container Sizing] Setting container to:",
        actualDisplayedWidth,
        "x",
        actualDisplayedHeight
      );
      heatmapContainerRef.current.style.height = `${Math.round(
        actualDisplayedHeight
      )}px`;
      heatmapContainerRef.current.style.width = `${Math.round(
        actualDisplayedWidth
      )}px`;
    }
  }, [
    heatmapInstance,
    pagePath,
    selectedDevice,
    fetchHeatmapData,
    fetchElementClicks,
  ]);

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

    // Clear smart elements and element clicks when switching pages/devices
    setSmartElements([]);
    setElementClicks({});

    // Set timeout for the new image - but shorter for first load (no screenshot exists yet)
    // After timeout, if still not loaded, show "no screenshot" message instead of error
    console.log("Setting timeout for screenshot load:", url);
    imageLoadTimeoutRef.current = setTimeout(() => {
      console.log(
        "Screenshot load timeout fired - no image loaded in 15 seconds"
      );
      setError(
        "No preview available for this page yet. Click 'Refresh Preview' to generate one."
      );
      // Force hide the loading spinner
      setImageLoaded(true);
    }, 15000); // Increased to 15 seconds to allow Supabase URLs to load
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
      // Fetch smart map data when heatmap is ready to render
      fetchSmartMap(pagePath, selectedDevice);
      debouncedRenderHeatmap();
    }
  }, [
    heatmapInstance,
    imageLoaded,
    debouncedRenderHeatmap,
    pagePath,
    selectedDevice,
    fetchSmartMap,
  ]);

  // --- Handle image load event ---
  const handleImageLoad = () => {
    console.log("✅ Image loaded successfully - clearing timeout");
    // Clear any pending timeout IMMEDIATELY
    if (imageLoadTimeoutRef.current) {
      clearTimeout(imageLoadTimeoutRef.current);
      imageLoadTimeoutRef.current = null;
    }
    setError(null); // Clear any previous errors
    // Set imageLoaded immediately without setTimeout delay
    setImageLoaded(true);
    // Debounce the heatmap rendering
    setTimeout(() => {
      debouncedRenderHeatmap();
    }, 50);
  };

  // --- Handle image load error ---
  const handleImageError = () => {
    console.error("❌ Image failed to load from URL");
    if (imageLoadTimeoutRef.current) {
      clearTimeout(imageLoadTimeoutRef.current);
      imageLoadTimeoutRef.current = null;
    }
    setError(
      "Failed to load screenshot. The image URL may be broken or inaccessible."
    );
    setImageLoaded(true);
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

  // Show nothing while redirecting if no siteId
  if (mounted && !siteId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-slate-50 p-3 sm:p-6">
      <Head>
        <title>
          {siteName ? `${siteName} - Heatmap Viewer` : "Heatmap Viewer"} -
          NavLens Analytics
        </title>
      </Head>

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
                {siteName || "Smart Heatmap Viewer"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {siteDomain ? (
                  <>
                    Visualizing user interactions on{" "}
                    <a
                      href={siteDomain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      {siteDomain}
                    </a>
                  </>
                ) : (
                  "Visualize user interactions and detect interactive elements on your website"
                )}
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
                  {smartElements.length === 0 && (
                    <span className="block text-orange-600 mt-1">
                      No elements detected ({smartElements.length}). Generate a
                      screenshot first.
                    </span>
                  )}
                  {smartElements.length > 0 && (
                    <span className="block text-green-600 mt-1">
                      {smartElements.length} elements loaded
                    </span>
                  )}
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

            {/* Element Click Counts Toggle */}
            <div className="flex items-center mt-4 justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-red-600"
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
                    Click Counts
                  </span>
                </h3>
                <p className="text-xs text-gray-500">
                  Show click counts on interactive elements
                </p>
              </div>
              <button
                onClick={() => setShowElementClicks(!showElementClicks)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  showElementClicks
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300"
                }`}
              >
                {showElementClicks ? "Hide Counts" : "Show Counts"}
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
              onError={handleImageError}
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
              className="absolute top-0 left-0 w-full z-10 transition-opacity duration-300"
              style={{
                opacity: imageLoaded ? 1 : 0,
                pointerEvents: "none",
              }}
            ></div>
          )}

          {/* --- Smart Elements Overlay (v2.0 Feature) --- */}
          {showSmartMap && imageLoaded && (
            <div className="absolute top-0 left-0 w-full h-auto z-20 pointer-events-none">
              {smartElements.length === 0 ? (
                <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-lg shadow-lg">
                  <p className="text-sm font-medium">No smart elements found</p>
                  <p className="text-xs">
                    Generate a screenshot to detect interactive elements
                  </p>
                </div>
              ) : (
                <>
                  {smartElements.map((el: SmartElement, i: number) => {
                    // Calculate scaling based on current displayed width vs original screenshot width
                    // We assume the image takes up 100% of the container width
                    const currentWidth =
                      heatmapViewportRef.current?.offsetWidth ||
                      DEVICE_PROFILES[selectedDevice].width;
                    const scale =
                      currentWidth / DEVICE_PROFILES[selectedDevice].width;

                    const clickCount = elementClicks[el.selector] || 0;
                    const hasClicks = clickCount > 0;

                    return (
                      <div
                        key={i}
                        title={`${el.tag}: ${el.text}\nSelector: ${el.selector}\nClicks: ${clickCount}`}
                        className={`absolute border-2 rounded-sm pointer-events-auto transition-all duration-200 ${
                          hasClicks
                            ? "border-red-500/60 bg-red-500/15 hover:bg-red-500/25 hover:border-red-500"
                            : "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500"
                        }`}
                        style={{
                          // Scale the coordinates from the JSON to match the current view
                          left: `${el.x * scale}px`,
                          top: `${el.y * scale}px`,
                          width: `${el.width * scale}px`,
                          height: `${el.height * scale}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openElementInsights(el);
                        }}
                        onMouseEnter={(e) => {
                          const target = e.currentTarget as HTMLElement;
                          if (hasClicks) {
                            target.style.borderColor = "rgb(239 68 68 / 0.8)";
                            target.style.backgroundColor =
                              "rgb(239 68 68 / 0.2)";
                          } else {
                            target.style.borderColor = "rgb(59 130 246 / 0.8)";
                            target.style.backgroundColor =
                              "rgb(59 130 246 / 0.15)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          const target = e.currentTarget as HTMLElement;
                          if (hasClicks) {
                            target.style.borderColor = "rgb(239 68 68 / 0.6)";
                            target.style.backgroundColor =
                              "rgb(239 68 68 / 0.15)";
                          } else {
                            target.style.borderColor = "rgb(59 130 246 / 0.4)";
                            target.style.backgroundColor =
                              "rgb(59 130 246 / 0.1)";
                          }
                        }}
                      >
                        {/* Click count badge */}
                        {showElementClicks && hasClicks && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {clickCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
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

      {/* Element Insights Modal */}
      {selectedElement && elementInsights && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Custom Scrollbar Styles */}
            <style jsx>{`
              .modal-scroll::-webkit-scrollbar {
                width: 8px;
              }
              .modal-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
              }
              .modal-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
                transition: background-color 0.2s ease;
              }
              .modal-scroll::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
              .modal-scroll {
                scrollbar-width: thin;
                scrollbar-color: #cbd5e1 #f1f5f9;
              }
            `}</style>

            <div className="modal-scroll overflow-y-auto max-h-[85vh] sm:max-h-[90vh]">
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      Element Insights
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Performance analysis for{" "}
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm font-mono">
                        {selectedElement.tag}
                      </code>
                    </p>
                  </div>
                  <button
                    onClick={closeElementInsights}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg ml-4 shrink-0"
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">
                      {elementInsights.clickCount}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700 font-medium">
                      Total Clicks
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">
                      {elementInsights.clickPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs sm:text-sm text-green-700 font-medium">
                      Click Share
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 sm:p-4 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">
                      #{elementInsights.rank}
                    </div>
                    <div className="text-xs sm:text-sm text-purple-700 font-medium">
                      Popularity Rank
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 sm:p-4 rounded-lg text-center">
                    <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">
                      {elementInsights.totalPageClicks}
                    </div>
                    <div className="text-xs sm:text-sm text-orange-700 font-medium">
                      Page Total
                    </div>
                  </div>
                </div>

                {/* Element Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Element Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600 font-medium">
                        Element Type:
                      </span>
                      <span className="font-mono bg-white px-2 py-1 rounded text-xs">
                        &lt;{selectedElement.tag}&gt;
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600 font-medium">
                        Content:
                      </span>
                      <span
                        className="font-medium max-w-full sm:max-w-xs truncate bg-white px-2 py-1 rounded text-xs"
                        title={selectedElement.text}
                      >
                        &ldquo;{selectedElement.text}&rdquo;
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600 font-medium">
                        Position:
                      </span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                        {selectedElement.x}, {selectedElement.y}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-gray-600 font-medium">Size:</span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                        {selectedElement.width} × {selectedElement.height}px
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insights & Recommendations */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Performance Insights
                  </h3>

                  {/* Click Performance */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                          elementInsights.clickPercentage > 20
                            ? "bg-green-500"
                            : elementInsights.clickPercentage > 10
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">
                          Click Performance
                        </h4>
                        <p className="text-sm text-gray-600">
                          {elementInsights.clickPercentage > 20
                            ? "Excellent! This element captures a significant portion of user attention."
                            : elementInsights.clickPercentage > 10
                            ? "Good performance. Consider optimizing placement for better results."
                            : "Low engagement. May need visual improvements or better positioning."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Element Type Insights */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">
                          Element Type Analysis
                        </h4>
                        <p className="text-sm text-gray-600">
                          {selectedElement.tag === "BUTTON" ||
                          selectedElement.tag === "A"
                            ? "Interactive element performing well for user actions."
                            : selectedElement.tag === "INPUT" ||
                              selectedElement.tag === "SELECT"
                            ? "Form element - consider usability improvements if click rates are low."
                            : "Content element - focus on visual hierarchy and call-to-action placement."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mt-1 shrink-0"></div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">
                          Recommendations
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {elementInsights.clickPercentage < 5 && (
                            <li>
                              • Consider making this element more prominent or
                              visible
                            </li>
                          )}
                          {elementInsights.rank > 5 && (
                            <li>
                              • This element ranks low - review its importance
                              and placement
                            </li>
                          )}
                          {selectedElement.width < 100 ||
                            (selectedElement.height < 30 && (
                              <li>
                                • Element size may be too small for easy
                                interaction
                              </li>
                            ))}
                          <li>
                            • A/B test different colors, sizes, or positions to
                            improve engagement
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
