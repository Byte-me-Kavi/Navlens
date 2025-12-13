"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { HeatmapViewer, HeatmapSettings } from "@/features/heatmap";
import { ArrowLeftIcon, GlobeAltIcon } from "@heroicons/react/24/outline";

export default function HeatmapViewerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    selectedSiteId: siteId,
    getPagesList,
    getPagesFromCache,
    pagesLoading,
  } = useSite();
  const [selectedPage, setSelectedPage] = useState("/");

  // Detect user's actual device on mount
  const [userDevice, setUserDevice] = useState<"desktop" | "mobile" | "tablet">(
    "desktop"
  );
  const [selectedDevice, setSelectedDevice] = useState<
    "desktop" | "mobile" | "tablet"
  >("desktop");
  const [selectedDataType, setSelectedDataType] = useState<
    "clicks" | "scrolls" | "hover" | "cursor-paths" | "elements"
  >(() => {
    // Read from URL query param if available
    const typeFromUrl = searchParams.get("type");
    if (typeFromUrl === "clicks" || typeFromUrl === "scrolls" || typeFromUrl === "hover" || typeFromUrl === "cursor-paths" || typeFromUrl === "elements") {
      return typeFromUrl;
    }
    return "clicks";
  });
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [noDataFound, setNoDataFound] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statsBarOpen, setStatsBarOpen] = useState(false);
  const [showElements, setShowElements] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAllViewports, setShowAllViewports] = useState(false);

  // Handler to open settings sidebar and close stats
  const handleOpenSettings = () => {
    setSidebarOpen(true);
    setStatsBarOpen(false);
  };

  // Handler to open stats sidebar and close settings
  const handleOpenStats = () => {
    setStatsBarOpen(true);
    setSidebarOpen(false);
  };

  // Handler to close settings sidebar
  const handleCloseSettings = () => {
    setSidebarOpen(false);
  };

  // Handler to close stats sidebar
  const handleCloseStats = () => {
    setStatsBarOpen(false);
  };

  // Detect user's device type
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        return "mobile";
      } else if (width < 1024) {
        return "tablet";
      } else {
        return "desktop";
      }
    };

    const detected = detectDevice();
    setUserDevice(detected);
    setSelectedDevice(detected);
  }, []); // Handler for device change with logging
  const handleDeviceChange = (device: "desktop" | "mobile" | "tablet") => {
    console.log(
      "[HeatmapViewerPage] Device changed from",
      selectedDevice,
      "to",
      device
    );
    setSelectedDevice(device);
  };

  // Handler for page change with logging
  const handlePageChange = (page: string) => {
    console.log(
      "[HeatmapViewerPage] Page changed from",
      selectedPage,
      "to",
      page
    );
    setSelectedPage(page);
  };

  // Redirect to dashboard if site context is lost (page refresh scenario)
  useEffect(() => {
    if (!siteId) {
      // Check if this is a page refresh by looking at sessionStorage
      const hasVisitedBefore = sessionStorage.getItem("heatmap-viewer-visited");

      if (hasVisitedBefore) {
        // This is likely a refresh - redirect to dashboard
        console.log("Site context lost, redirecting to dashboard");
        router.push("/dashboard/heatmaps");
        return;
      }

      // First visit - wait a bit to see if context loads
      const timeout = setTimeout(() => {
        if (!siteId) {
          console.log(
            "Site context not available after timeout, redirecting to dashboard"
          );
          router.push("/dashboard/heatmaps");
        }
      }, 3000); // 3 second timeout

      return () => clearTimeout(timeout);
    } else {
      // Mark that we've visited this page
      sessionStorage.setItem("heatmap-viewer-visited", "true");
    }
  }, [siteId, router]);

  // Set appropriate overlays based on data type
  useEffect(() => {
    if (selectedDataType === "clicks") {
      setShowHeatmap(true);
      setShowElements(false); // Don't auto-show elements with clicks
    } else if (selectedDataType === "elements") {
      setShowHeatmap(false);
      setShowElements(true);
    }
  }, [selectedDataType]);

  // Fetch available pages (using centralized cache)
  useEffect(() => {
    if (!siteId) return;

    const fetchPages = async () => {
      try {
        // First check if we have cached pages (instant)
        const cachedPages = getPagesFromCache(siteId);
        if (cachedPages && cachedPages.length > 0) {
          console.log(
            "[HeatmapViewerPage] Using cached pages:",
            cachedPages.length
          );
          setAvailablePages(cachedPages);
          if (!selectedPage || selectedPage === "/") {
            setSelectedPage(cachedPages[0]);
          }
          setLoading(false);
          return;
        }

        // Fetch from API (with context caching)
        const pages = await getPagesList(siteId);
        console.log("[HeatmapViewerPage] Pages fetched:", pages.length);
        setAvailablePages(pages);

        // Set first page as default if available
        if (pages.length > 0) {
          console.log("[HeatmapViewerPage] Setting initial page to:", pages[0]);
          setSelectedPage(pages[0]);
        } else {
          console.warn("[HeatmapViewerPage] No pages found for site:", siteId);
        }
        setNoDataFound(pages.length === 0);
      } catch (error) {
        console.error("Failed to fetch pages:", error);
        setNoDataFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]); // Only re-run when siteId changes, functions are stable from context

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading heatmap viewer..." />
      </div>
    );
  }

  // Show no-data state with friendly message
  if (!siteId || noDataFound || availablePages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="inline-flex p-4 bg-blue-50 rounded-full mb-6">
            <GlobeAltIcon className="w-12 h-12 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            No Visitor Data Yet
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            No users have visited your site yet, or no page snapshots have been captured. 
            Heatmap previews will be available once visitors start interacting with your site.
          </p>
          <button
            onClick={() => router.push("/dashboard/heatmaps")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Heatmaps
          </button>
        </div>
      </div>
    );
  }

  // Log when page or device changes
  console.log("[HeatmapViewerPage] Rendering with:", {
    selectedPage,
    selectedDevice,
    key: `${selectedPage}-${selectedDevice}`,
  });

  return (
    <div className="h-screen relative bg-slate-50 dark:bg-slate-900">
      {/* Floating Back Button - Positioned next to Settings Toggle */}
      <Link 
         href="/dashboard/heatmaps"
         className="fixed top-4 sm:top-6 left-20 sm:left-24 z-[1000] p-3 bg-white/90 backdrop-blur-sm shadow-lg rounded-xl text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 transition-all hover:scale-105 flex items-center justify-center"
         title="Back to Heatmaps"
      >
         <ArrowLeftIcon className="w-6 h-6" />
      </Link>

      {/* Full Screen Heatmap Viewer */}
      {/* Key prop forces remount when page/device changes to load new snapshot */}
      <HeatmapViewer
        key={`${selectedPage}-${selectedDevice}`}
        siteId={siteId}
        pagePath={selectedPage}
        deviceType={selectedDevice}
        dataType={selectedDataType}
        showElements={showElements}
        showHeatmap={showHeatmap}
        showAllViewports={showAllViewports}
        onViewportModeChange={(showAll) => setShowAllViewports(showAll)}
        userDevice={userDevice}
        statsBarOpen={statsBarOpen}
        onStatsBarOpenChange={handleOpenStats}
        onStatsBarClose={handleCloseStats}
      />

      {/* Heatmap Settings Sidebar Component - Overlay */}
      <HeatmapSettings
        availablePages={availablePages}
        selectedPage={selectedPage}
        onPageChange={handlePageChange}
        selectedDevice={selectedDevice}
        onDeviceChange={handleDeviceChange}
        userDevice={userDevice}
        selectedDataType={selectedDataType}
        onDataTypeChange={setSelectedDataType}
        showElements={showElements}
        onShowElementsChange={setShowElements}
        showHeatmap={showHeatmap}
        onShowHeatmapChange={setShowHeatmap}
        showAllViewports={showAllViewports}
        onShowAllViewportsChange={setShowAllViewports}
        siteId={siteId}
        isOpen={sidebarOpen}
        onOpenChange={handleOpenSettings}
        onClose={handleCloseSettings}
      />
    </div>
  );
}
