
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
  ChevronUpIcon,
  ChevronDownIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { useAI } from "@/context/AIProvider";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

// Data type configuration for the dropdown
const DATA_TYPES = [
  { value: "clicks", label: "Click Heatmap", icon: CursorArrowRippleIcon },
  { value: "scrolls", label: "Scroll Heatmap", icon: ArrowTrendingDownIcon },
  { value: "hover", label: "Hover Heatmap", icon: EyeIcon },
  { value: "cursor-paths", label: "Cursor Paths", icon: ArrowsPointingOutIcon },
  { value: "elements", label: "Smart Elements", icon: ViewfinderCircleIcon },
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
  const [showElements, setShowElements] = useState(() => {
    return searchParams.get("showElements") === "true";
  });
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAllViewports, setShowAllViewports] = useState(false);
  const [dateRangeDays, setDateRangeDays] = useState<7 | 30 | 90>(30);
  
  // Navbar minimize state
  const [isNavMinimized, setIsNavMinimized] = useState(false);
  const lastScrollY = useRef(0);

  // Custom dropdown states
  const [dataTypeDropdownOpen, setDataTypeDropdownOpen] = useState(false);
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dataTypeRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

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

  // Toggle navbar minimize
  const toggleNavMinimize = () => {
    setIsNavMinimized(!isNavMinimized);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dataTypeRef.current && !dataTypeRef.current.contains(target)) {
        setDataTypeDropdownOpen(false);
      }
      if (pageRef.current && !pageRef.current.contains(target)) {
        setPageDropdownOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(target)) {
        setDateDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle iframe scroll to auto-minimize navbar
  const handleIframeScroll = useCallback((scrollY: number) => {
    if (scrollY > lastScrollY.current && scrollY > 100) {
      // Scrolling down - minimize
      setIsNavMinimized(true);
    } else if (scrollY < lastScrollY.current - 50) {
      // Scrolling up significantly - expand
      setIsNavMinimized(false);
    }
    lastScrollY.current = scrollY;
  }, []);

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
    if (dataType === "elements") {
        setShowElements(true);
    }
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md text-center">
          <div className="inline-flex p-4 bg-indigo-50 rounded-2xl mb-6">
            <GlobeAltIcon className="w-12 h-12 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            No Visitor Data Yet
          </h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            No users have visited your site yet, or no page snapshots have been captured. 
            Heatmap previews will be available once visitors start interacting with your site.
          </p>
          <button
            onClick={() => router.push("/dashboard/heatmaps")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
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
    <div className="h-screen flex flex-col">
      {/* Collapsible Navbar */}
      <nav className={`bg-white border-b border-gray-200 shadow-sm transition-all duration-300 ${isNavMinimized ? 'py-1' : ''}`}>
        {/* Minimized State - Compact Bar */}
        {isNavMinimized ? (
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard/heatmaps"
                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </Link>
              <span className="text-sm font-semibold text-gray-900">{currentDataType?.label}</span>
              <span className="text-xs text-gray-500 truncate max-w-[150px]">{selectedPage}</span>
            </div>
            <button
              onClick={toggleNavMinimize}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
              title="Expand toolbar"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Main Controls Row */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Back & Site Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <Link 
                    href="/dashboard/heatmaps"
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                    title="Back to Heatmaps"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </Link>
                  
                  <div className="min-w-0 hidden md:block">
                    <h1 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <GlobeAltIcon className="w-4 h-4 text-indigo-600" />
                      {currentSite?.site_name || "Heatmap Viewer"}
                    </h1>
                    <p className="text-xs text-indigo-600 font-medium truncate">
                      {currentSite?.domain || "No site selected"}
                    </p>
                  </div>
                </div>

                {/* Center: Main Controls */}
                <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
                  {/* Data Type Selector - Custom Dropdown */}
                  <div className="relative" ref={dataTypeRef}>
                    <button
                      onClick={() => {
                        setDataTypeDropdownOpen(!dataTypeDropdownOpen);
                        setPageDropdownOpen(false);
                        setDateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 hover:bg-indigo-100 transition-colors"
                    >
                      <DataTypeIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-indigo-900">{currentDataType?.label}</span>
                      <ChevronDownIcon className={`w-4 h-4 text-indigo-600 transition-transform ${dataTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dataTypeDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-[100] min-w-[180px]">
                        {DATA_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.value}
                              onClick={() => {
                                handleDataTypeChange(type.value);
                                setDataTypeDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                                selectedDataType === type.value
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Page Selector - Custom Dropdown */}
                  <div className="relative" ref={pageRef}>
                    <button
                      onClick={() => {
                        setPageDropdownOpen(!pageDropdownOpen);
                        setDataTypeDropdownOpen(false);
                        setDateDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors max-w-xs"
                    >
                      <span className="text-xs font-medium text-gray-500 hidden lg:inline">Page:</span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[180px]" title={selectedPage}>
                        {selectedPage}
                      </span>
                      <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${pageDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {pageDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-[100] max-h-64 overflow-y-auto min-w-[200px]">
                        {availablePages.map((page) => (
                          <button
                            key={page}
                            onClick={() => {
                              handlePageChange(page);
                              setPageDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm truncate transition-colors ${
                              selectedPage === page
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            title={page}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Device Selector */}
                  <div className="flex items-center gap-0.5 bg-gray-100 border border-gray-200 rounded-xl p-1">
                    <button
                      onClick={() => handleDeviceChange("desktop")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        selectedDevice === "desktop"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      title="Desktop View"
                    >
                      <ComputerDesktopIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                      onClick={() => handleDeviceChange("tablet")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        selectedDevice === "tablet"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      title="Tablet View"
                    >
                      <DeviceTabletIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Tablet</span>
                    </button>
                    <button
                      onClick={() => handleDeviceChange("mobile")}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        selectedDevice === "mobile"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
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
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                      showAllViewports
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
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
                  {/* Date Range Picker - Custom Dropdown */}
                  <div className="relative" ref={dateRef}>
                    <button
                      onClick={() => {
                        setDateDropdownOpen(!dateDropdownOpen);
                        setDataTypeDropdownOpen(false);
                        setPageDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <CalendarDaysIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Last {dateRangeDays} days</span>
                      <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${dateDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {dateDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-[100] min-w-[140px]">
                        {DATE_RANGES.map((range) => (
                          <button
                            key={range.value}
                            onClick={() => {
                              setDateRangeDays(range.value as 7 | 30 | 90);
                              setDateDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              dateRangeDays === range.value
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            Last {range.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Button */}
                  <button
                    onClick={handleAIAnalysis}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white transition-all shadow-sm"
                    title="AI Analysis"
                  >
                    <BoltIcon className="w-4 h-4" />
                    <span className="hidden md:inline text-xs font-semibold">Navlens AI</span>
                  </button>

                  {/* Stats Toggle */}
                  <button
                    onClick={handleToggleStats}
                    className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                      statsBarOpen 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    }`}
                    title="Toggle Device Stats"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-medium">Stats</span>
                  </button>

                  {/* Minimize Button */}
                  <button
                    onClick={toggleNavMinimize}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                    title="Minimize toolbar"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Info Bar */}
            <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 overflow-x-auto">
                <span className="flex items-center gap-1 font-medium text-indigo-600">
                  <DataTypeIcon className="w-3 h-3" />
                  {currentDataType?.label}
                </span>
                <span className="text-gray-300">•</span>
                <span className="truncate max-w-[200px] sm:max-w-[300px]" title={selectedPage}>
                  {selectedPage}
                </span>
                <span className="text-gray-300">•</span>
                <span className="capitalize">{selectedDevice}</span>
                {showAllViewports && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-indigo-600 font-medium">All Viewports</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
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
          onIframeScroll={handleIframeScroll}
        />
      </div>
    </div>
  );
}
