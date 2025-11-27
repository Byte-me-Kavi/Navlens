"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { HeatmapViewer, HeatmapSettings } from "@/features/heatmap";

export default function HeatmapViewerPage() {
  const router = useRouter();
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
    "clicks" | "scrolls"
  >("clicks");
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statsBarOpen, setStatsBarOpen] = useState(false);
  const [showElements, setShowElements] = useState(true);
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

  // Automatically show heatmap blobs and element overlays when clicks mode is selected
  useEffect(() => {
    if (selectedDataType === "clicks") {
      setShowHeatmap(true);
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
      } catch (error) {
        console.error("Failed to fetch pages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]); // Only re-run when siteId changes, functions are stable from context

  // Don't render until we have pages loaded and a valid page selected
  if (loading || !siteId || availablePages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner
          message={
            loading
              ? "Loading heatmap viewer..."
              : availablePages.length === 0
              ? "No pages found with snapshots..."
              : "Initializing..."
          }
        />
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
