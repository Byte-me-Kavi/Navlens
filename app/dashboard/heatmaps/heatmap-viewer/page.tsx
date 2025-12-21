
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { HeatmapViewer } from "@/features/heatmap";
import {
  ArrowLeftIcon,
  GlobeAltIcon,
  SparklesIcon,
  CursorArrowRippleIcon,
  ArrowsPointingOutIcon,
  ViewfinderCircleIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { useAI } from "@/context/AIProvider";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

// Data type configuration for the dropdown
const DATA_TYPES = [
  { value: "clicks", label: "Click Heatmap", color: "blue", icon: CursorArrowRippleIcon },
  { value: "scrolls", label: "Scroll Heatmap", color: "purple", icon: ArrowTrendingDownIcon },
  { value: "hover", label: "Hover Heatmap", color: "cyan", icon: EyeIcon },
  { value: "cursor-paths", label: "Cursor Paths", color: "amber", icon: ArrowsPointingOutIcon },
  { value: "elements", label: "Smart Elements", color: "rose", icon: ViewfinderCircleIcon },
] as const;

// Date range options
const DATE_RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
] as const;

export default function HeatmapViewerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    selectedSiteId: siteId,
    getPagesList,
    getPagesFromCache,
    getSiteById,
  } = useSite();
  const { openChat } = useAI();
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
    const typeFromUrl = searchParams.get("type");
    if (typeFromUrl === "clicks" || typeFromUrl === "scrolls" || typeFromUrl === "hover" || typeFromUrl === "cursor-paths" || typeFromUrl === "elements") {
      return typeFromUrl;
    }
    return "clicks";
  });
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [noDataFound, setNoDataFound] = useState(false);
  const [statsBarOpen, setStatsBarOpen] = useState(false);
  const [showElements, setShowElements] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAllViewports, setShowAllViewports] = useState(false);
  const [dateRangeDays, setDateRangeDays] = useState<7 | 30 | 90>(30);

  // Get current site details
  const currentSite = siteId ? getSiteById(siteId) : null;

  // Handle AI analysis for heatmap
  const handleAIAnalysis = () => {
    openChat('heatmap', {
      pagePath: selectedPage,
      deviceType: selectedDevice,
      dataType: selectedDataType,
      showElements,
      showHeatmap,
    });
  };

  // Handler to toggle stats sidebar
  const handleToggleStats = () => {
    setStatsBarOpen(!statsBarOpen);
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
  }, []);

  // Handler for device change
  const handleDeviceChange = (device: "desktop" | "mobile" | "tablet") => {
    setSelectedDevice(device);
  };

  // Handler for page change
  const handlePageChange = (page: string) => {
    setSelectedPage(page);
  };

  // Handler for data type change
  const handleDataTypeChange = (dataType: "clicks" | "scrolls" | "hover" | "cursor-paths" | "elements") => {
    setSelectedDataType(dataType);
  };

  // Redirect to dashboard if site context is lost
  useEffect(() => {
    if (!siteId) {
      const hasVisitedBefore = sessionStorage.getItem("heatmap-viewer-visited");
      if (hasVisitedBefore) {
        router.push("/dashboard/heatmaps");
        return;
      }
      const timeout = setTimeout(() => {
        if (!siteId) {
          router.push("/dashboard/heatmaps");
        }
      }, 3000);
      return () => clearTimeout(timeout);
    } else {
      sessionStorage.setItem("heatmap-viewer-visited", "true");
    }
  }, [siteId, router]);

  // Set appropriate overlays based on data type
  useEffect(() => {
    if (selectedDataType === "clicks") {
      setShowHeatmap(true);
      setShowElements(false);
    } else if (selectedDataType === "elements") {
      setShowHeatmap(false);
      setShowElements(true);
    }
  }, [selectedDataType]);

  // Fetch available pages
  useEffect(() => {
    if (!siteId) return;

    const fetchPages = async () => {
      try {
        const cachedPages = getPagesFromCache(siteId);
        if (cachedPages && cachedPages.length > 0) {
          setAvailablePages(cachedPages);
          if (!selectedPage || selectedPage === "/") {
            setSelectedPage(cachedPages[0]);
          }
          setLoading(false);
          return;
        }

        const pages = await getPagesList(siteId);
        setAvailablePages(pages);
        if (pages.length > 0) {
          setSelectedPage(pages[0]);
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
  }, [siteId]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading heatmap viewer..." />
      </div>
    );
  }

  // Show no-data state
  if (!siteId || noDataFound || availablePages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Heatmaps
          </button>
        </div>
      </div>
    );
  }

  const currentDataType = DATA_TYPES.find(dt => dt.value === selectedDataType);
  const DataTypeIcon = currentDataType?.icon || ChartBarIcon;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Enhanced Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        {/* Main Controls Row */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back & Site Info */}
            <div className="flex items-center gap-3 min-w-0">
              <Link 
                href="/dashboard/heatmaps"
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 hover:text-gray-900 transition-colors flex-shrink-0"
                title="Back to Heatmaps"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              
              <div className="min-w-0 hidden md:block">
                <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <GlobeAltIcon className="w-5 h-5 text-blue-600" />
                  {currentSite?.site_name || "Heatmap Viewer"}
                </h1>
                <p className="text-xs text-gray-500 truncate">
                  {currentSite?.domain || "No site selected"}
                </p>
              </div>
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-3 flex-1 justify-center flex-wrap">
              {/* Data Type Selector */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2">
                <DataTypeIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <select
                  value={selectedDataType}
                  onChange={(e) => handleDataTypeChange(e.target.value as typeof selectedDataType)}
                  className="bg-transparent focus:outline-none text-sm font-semibold text-blue-900 cursor-pointer"
                >
                  {DATA_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Selector */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-xs">
                <span className="text-xs font-medium text-gray-500 hidden lg:inline">Page:</span>
                <select
                  value={selectedPage}
                  onChange={(e) => handlePageChange(e.target.value)}
                  className="bg-transparent focus:outline-none text-sm font-medium text-gray-900 truncate cursor-pointer max-w-[140px] sm:max-w-[200px]"
                  title={selectedPage}
                >
                  {availablePages.map((page) => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1">
                <button
                  onClick={() => handleDeviceChange("desktop")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedDevice === "desktop"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Desktop View"
                >
                  <ComputerDesktopIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  onClick={() => handleDeviceChange("tablet")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedDevice === "tablet"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Tablet View"
                >
                  <DeviceTabletIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  onClick={() => handleDeviceChange("mobile")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedDevice === "mobile"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Mobile View"
                >
                  <DevicePhoneMobileIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              {/* Viewport Toggle */}
              <button
                onClick={() => setShowAllViewports(!showAllViewports)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  showAllViewports
                    ? "bg-purple-50 text-purple-700 border-purple-300"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
                title={showAllViewports ? "All Viewports Mode" : "Current Viewport Only"}
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
                <span className="hidden lg:inline">
                  {showAllViewports ? "All Sizes" : "Single Size"}
                </span>
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Date Range Picker */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                <select
                  value={dateRangeDays}
                  onChange={(e) => setDateRangeDays(Number(e.target.value) as 7 | 30 | 90)}
                  className="bg-transparent focus:outline-none text-sm font-medium text-gray-700 cursor-pointer"
                >
                  {DATE_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      Last {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Button */}
              <button
                onClick={handleAIAnalysis}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg text-white transition-all shadow-sm"
                title="AI Analysis"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-semibold">Navlens AI</span>
              </button>

              {/* Stats Toggle */}
              <button
                onClick={handleToggleStats}
                className={`p-2 rounded-lg transition-all ${
                  statsBarOpen 
                    ? "bg-blue-600 flex gap-1.5 text-white shadow-sm" 
                    : "bg-gray-100 flex gap-1.5 hover:bg-gray-200 text-gray-700"
                }`}
                title="Toggle Device Stats"
              >
                <ChartBarIcon className="w-5 h-5" />
                <span>Device Stats</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Bar */}
        <div className="px-4 py-2 bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-600 overflow-x-auto">
            <span className="flex items-center gap-1.5 font-medium">
              <DataTypeIcon className="w-3.5 h-3.5 text-blue-600" />
              {currentDataType?.label}
            </span>
            <span className="text-gray-300">•</span>
            <span className="truncate max-w-[200px] sm:max-w-[300px]" title={selectedPage}>
              {selectedPage}
            </span>
            <span className="text-gray-300">•</span>
            <span className="capitalize font-medium">{selectedDevice}</span>
            {showAllViewports && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-purple-600 font-semibold">All Viewports</span>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
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
          onStatsBarOpenChange={handleToggleStats}
          onStatsBarClose={handleCloseStats}
        />
      </div>
    </div>
  );
}

