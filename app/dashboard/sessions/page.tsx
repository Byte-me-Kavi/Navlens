"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import { apiClient } from "@/shared/services/api/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import "flag-icons/css/flag-icons.min.css";
import countries from "world-countries";
import {
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiClock,
  FiEye,
  FiPlay,
  FiSearch,
  FiCalendar,
  FiFilter,
  FiGlobe,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiAlertTriangle,
  FiAlertCircle,
  FiMousePointer,
  FiCornerUpLeft,
} from "react-icons/fi";
import { HiOutlineDesktopComputer } from "react-icons/hi";
import { BsDisplay, BsWindows, BsApple } from "react-icons/bs";
import { FaLinux, FaAndroid } from "react-icons/fa";
import { AiOutlineApple } from "react-icons/ai";
import { SiGooglechrome, SiFirefox, SiSafari, SiOpera } from "react-icons/si";

interface SessionSignal {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface SessionData {
  session_id: string;
  visitor_id: string;
  timestamp: string;
  duration: number;
  page_views: number;
  pages: string[];
  country: string;
  ip_address: string;
  device_type: string;
  screen_width: number;
  screen_height: number;
  platform: string;
  user_agent: string;
  // Session Intelligence
  signals?: SessionSignal[];
  signal_counts?: Record<string, number>;
  has_rage_clicks?: boolean;
  has_dead_clicks?: boolean;
  has_u_turns?: boolean;
  has_errors?: boolean;
}

const getCountryFlag = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return null;
  return countryCode.toUpperCase();
};

const getCountryName = (countryCode: string) => {
  try {
    if (!countryCode || countryCode.length !== 2) return "Unknown";
    const country = countries.find(
      (c: { cca2: string; name?: { common: string } }) =>
        c.cca2.toUpperCase() === countryCode.toUpperCase()
    );
    return country?.name?.common || countryCode || "Unknown";
  } catch {
    return countryCode || "Unknown";
  }
};

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return <FiSmartphone className="w-5 h-5" />;
    case "tablet":
      return <FiTablet className="w-5 h-5" />;
    case "desktop":
      return <FiMonitor className="w-5 h-5" />;
    default:
      return <HiOutlineDesktopComputer className="w-5 h-5" />;
  }
};

const getOSIcon = (platform: string, userAgent?: string) => {
  const p = platform?.toLowerCase() || "";
  const ua = userAgent?.toLowerCase() || "";

  // Check user agent first for more reliable detection
  if (ua.includes("android")) return <FaAndroid className="w-4 h-4" />;
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod"))
    return <AiOutlineApple className="w-4 h-4" />;
  if (ua.includes("windows")) return <BsWindows className="w-4 h-4" />;
  if (ua.includes("mac")) return <BsApple className="w-4 h-4" />;
  if (ua.includes("linux") && !ua.includes("android"))
    return <FaLinux className="w-4 h-4" />;

  // Fallback to platform field
  if (p.includes("android")) return <FaAndroid className="w-4 h-4" />;
  if (p.includes("ios") || p.includes("iphone"))
    return <AiOutlineApple className="w-4 h-4" />;
  if (p.includes("linux")) return <FaLinux className="w-4 h-4" />;
  if (p.includes("win")) return <BsWindows className="w-4 h-4" />;
  if (p.includes("mac")) return <BsApple className="w-4 h-4" />;
  return <BsDisplay className="w-4 h-4" />;
};

const getBrowserIcon = (userAgent: string) => {
  const ua = userAgent?.toLowerCase() || "";
  if (ua.includes("chrome") && !ua.includes("edg")) {
    return <SiGooglechrome className="w-5 h-5" />;
  }
  if (ua.includes("firefox")) {
    return <SiFirefox className="w-5 h-5" />;
  }
  if (ua.includes("safari") && !ua.includes("chrome")) {
    return <SiSafari className="w-5 h-5" />;
  }
  if (ua.includes("edg") || ua.includes("edge")) {
    return <BsDisplay className="w-5 h-5" />;
  }
  if (ua.includes("opera") || ua.includes("opr")) {
    return <SiOpera className="w-5 h-5" />;
  }
  return <BsDisplay className="w-5 h-5" />;
};

// Move cache OUTSIDE the component so it persists across navigation
const sessionsCache: Record<string, SessionData[]> = {};

// Signal badge component
const SignalBadges = ({ session }: { session: SessionData }) => {
  const badges = [];

  if (session.has_rage_clicks) {
    badges.push(
      <span
        key="rage"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full"
        title="Rage clicks detected"
      >
        <FiMousePointer className="w-3 h-3" />
        Rage
      </span>
    );
  }

  if (session.has_dead_clicks) {
    badges.push(
      <span
        key="dead"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full"
        title="Dead clicks detected"
      >
        <FiMousePointer className="w-3 h-3" />
        Dead
      </span>
    );
  }

  if (session.has_u_turns) {
    badges.push(
      <span
        key="uturn"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full"
        title="U-turn/quick exit detected"
      >
        <FiCornerUpLeft className="w-3 h-3" />
        U-turn
      </span>
    );
  }

  if (session.has_errors) {
    badges.push(
      <span
        key="error"
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full"
        title="JavaScript errors detected"
      >
        <FiAlertTriangle className="w-3 h-3" />
        Errors
      </span>
    );
  }

  if (badges.length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return <div className="flex flex-wrap gap-1">{badges}</div>;
};

export default function SessionsPage() {
  const router = useRouter();
  // Use centralized sites data from context
  const {
    selectedSiteId,
    setSelectedSiteId,
    sites,
    sitesLoading: loadingSites,
    fetchSites,
  } = useSite();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<string>("");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Ensure sites are fetched (will use cache if available)
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    if (!selectedSiteId) {
      console.log("No siteId available, staying on sessions page");
      setLoading(false);
      return;
    }

    // Check cache first - if it exists, don't fetch
    if (sessionsCache[selectedSiteId]) {
      console.log("✅ Using cached sessions for siteId:", selectedSiteId);
      setSessions(sessionsCache[selectedSiteId]);
      setFilteredSessions(sessionsCache[selectedSiteId]);
      setLoading(false);
      return;
    }

    // Cache miss - fetch from API
    const fetchSessions = async () => {
      try {
        setLoading(true);
        console.log("🔄 Calling apiClient.post with siteId:", selectedSiteId);
        const data = await apiClient.post<{ sessions: SessionData[] }>(
          "/sessions",
          {
            siteId: selectedSiteId,
          }
        );
        console.log("✅ Sessions data received:", data);
        const sessionData = data.sessions || [];

        // Cache the sessions
        sessionsCache[selectedSiteId] = sessionData;

        setSessions(sessionData);
        setFilteredSessions(sessionData);
      } catch (error) {
        console.error("❌ Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [selectedSiteId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...sessions];

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      filtered = filtered.filter(
        (s) => new Date(s.timestamp).toDateString() === filterDate
      );
    }

    // Device filter
    if (deviceFilter !== "all") {
      filtered = filtered.filter(
        (s) => s.device_type?.toLowerCase() === deviceFilter.toLowerCase()
      );
    }

    // Search filter (visitor ID, country, IP)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.visitor_id?.toLowerCase().includes(query) ||
          s.country?.toLowerCase().includes(query) ||
          s.ip_address?.toLowerCase().includes(query)
      );
    }

    setFilteredSessions(filtered);
  }, [dateFilter, deviceFilter, searchQuery, sessions]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const handlePlaySession = (sessionId: string) => {
    router.push(`/dashboard/sessions/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading sessions..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 md:py-4 md:px-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <p className="text-gray-600 flex items-center gap-2">
            <FiEye className="w-4 h-4" />
            View and replay user sessions across your sites
          </p>
        </div>

        {/* Site Selection */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Select Your Site
              </h2>
            </div>
          </div>

          {loadingSites ? (
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-500 mt-3">Loading your sites...</p>
            </div>
          ) : sites.length === 0 ? (
            <div className="bg-linear-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-8 border border-orange-200 text-center">
              <div className="inline-flex p-3 bg-white rounded-full mb-3 shadow-sm">
                <FiGlobe className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Sites Available
              </h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first site
              </p>
              <button
                onClick={() => router.push("/dashboard/my-sites")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:scale-105"
              >
                <FiGlobe className="w-4 h-4" />
                Create Site
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSelectedSiteId(site.id)}
                  className={`group relative bg-white rounded-xl shadow-lg p-6 border-2 transition-all hover:shadow-xl hover:scale-105 text-left ${
                    selectedSiteId === site.id
                      ? "border-blue-600 bg-linear-to-br from-blue-50 to-indigo-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {/* Selection Indicator */}
                  {selectedSiteId === site.id && (
                    <div className="absolute -top-2 -right-2 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-full p-1.5 shadow-lg">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Site Icon */}
                  <div
                    className={`inline-flex p-3 rounded-xl mb-3 transition-all ${
                      selectedSiteId === site.id
                        ? "bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg"
                        : "bg-linear-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100"
                    }`}
                  >
                    <FiGlobe
                      className={`w-6 h-6 ${
                        selectedSiteId === site.id
                          ? "text-white"
                          : "text-gray-600 group-hover:text-blue-600"
                      }`}
                    />
                  </div>

                  {/* Site Info */}
                  <h3
                    className={`text-lg font-bold mb-1 transition-colors ${
                      selectedSiteId === site.id
                        ? "text-blue-900"
                        : "text-gray-900 group-hover:text-blue-600"
                    }`}
                  >
                    {site.site_name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate font-mono bg-gray-50 px-2 py-1 rounded">
                    {site.domain}
                  </p>

                  {/* Hover Effect Overlay */}
                  <div
                    className={`absolute inset-0 rounded-xl transition-opacity ${
                      selectedSiteId === site.id
                        ? "opacity-0"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-indigo-600/5 rounded-xl"></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Show filters and sessions only when site is selected */}
        {!selectedSiteId ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
              <FiGlobe className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg font-medium">
              Please select a site to view sessions
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Choose from your sites above to start viewing session replays
            </p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <FiFilter className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FiSearch className="w-4 h-4 text-gray-500" />
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by visitor ID, country, IP..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                    />
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FiCalendar className="w-4 h-4 text-gray-500" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                  />
                </div>

                {/* Device Filter */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FiMonitor className="w-4 h-4 text-gray-500" />
                    Device
                  </label>
                  <select
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white cursor-pointer"
                  >
                    <option value="all">All Devices</option>
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(dateFilter || deviceFilter !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setDateFilter("");
                    setDeviceFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <FiX className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>

            {/* Sessions Count */}
            <div className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <FiEye className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </span>
            </div>

            {/* Sessions Table */}
            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
                <div className="inline-flex p-4 bg-linear-to-br from-blue-50 to-indigo-50 rounded-full mb-4">
                  <FiPlay className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No sessions found
                </h3>
                <p className="text-gray-600">
                  {sessions.length === 0
                    ? "No recorded sessions yet. Sessions will appear here once visitors interact with your site."
                    : "Try adjusting your filters to see more results."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Date/Time
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Location
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Duration
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Page Views
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Signals
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Screen
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Browser
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Device/OS
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">
                          Visitor ID
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSessions.map((session, index) => {
                        const { date, time } = formatDateTime(
                          session.timestamp
                        );
                        const isExpanded =
                          expandedSession === session.session_id;

                        return (
                          <React.Fragment key={session.session_id}>
                            <tr
                              className={`hover:bg-blue-50 transition-colors ${
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">
                                    {date}
                                  </div>
                                  <div className="text-gray-500">{time}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {getCountryFlag(session.country) && (
                                    <span
                                      className={`fi fi-${getCountryFlag(
                                        session.country
                                      )?.toLowerCase()}`}
                                      style={{ width: "24px", height: "18px" }}
                                    />
                                  )}
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                      {session.country || "Unknown"}
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                      {session.ip_address}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatDuration(session.duration)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() =>
                                    setExpandedSession(
                                      isExpanded ? null : session.session_id
                                    )
                                  }
                                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  <span className="bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <FiEye className="w-3.5 h-3.5" />
                                    {session.page_views}
                                  </span>
                                  {isExpanded ? (
                                    <FiChevronUp className="w-4 h-4" />
                                  ) : (
                                    <FiChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <SignalBadges session={session} />
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {session.screen_width} ×{" "}
                                  {session.screen_height}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center">
                                  {getBrowserIcon(session.user_agent)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 rounded-lg">
                                    {getDeviceIcon(session.device_type)}
                                  </div>
                                  <div className="p-2 bg-gray-50 rounded-lg">
                                    {getOSIcon(
                                      session.platform,
                                      session.user_agent
                                    )}
                                  </div>
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900 capitalize">
                                      {session.device_type || "Unknown"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                                  {session.visitor_id?.slice(0, 8)}...
                                </code>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() =>
                                    handlePlaySession(session.session_id)
                                  }
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:scale-105"
                                >
                                  <FiPlay className="w-4 h-4" />
                                  <span>Play</span>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="px-6 py-4 bg-linear-to-r from-blue-50 to-indigo-50"
                                >
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <FiEye className="w-4 h-4 text-blue-600" />
                                      Pages Visited:
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {session.pages.map((page, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg"
                                        >
                                          <span className="text-blue-600 font-medium">
                                            {idx + 1}.
                                          </span>
                                          <span className="text-gray-700 truncate">
                                            {page}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4 p-4">
                  {filteredSessions.map((session) => {
                    const { date, time } = formatDateTime(session.timestamp);
                    const isExpanded = expandedSession === session.session_id;

                    return (
                      <div
                        key={session.session_id}
                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getCountryFlag(session.country) && (
                              <span
                                className={`fi fi-${getCountryFlag(
                                  session.country
                                )?.toLowerCase()}`}
                                style={{ width: "32px", height: "24px" }}
                              />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">
                                {getCountryName(session.country)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {date}
                              </div>
                              <div className="text-xs text-gray-500">
                                {time}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handlePlaySession(session.session_id)
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                          >
                            <FiPlay className="w-4 h-4" />
                            Play
                          </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                            <div className="flex items-center gap-1.5 text-xs text-blue-700 mb-1">
                              <FiClock className="w-3 h-3" />
                              Duration
                            </div>
                            <div className="font-semibold text-gray-900">
                              {formatDuration(session.duration)}
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                            <div className="flex items-center gap-1.5 text-xs text-purple-700 mb-1">
                              <FiEye className="w-3 h-3" />
                              Page Views
                            </div>
                            <div className="font-semibold text-gray-900">
                              {session.page_views}
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                            <div className="flex items-center gap-1.5 text-xs text-green-700 mb-1">
                              <BsDisplay className="w-3 h-3" />
                              Screen
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {session.screen_width} × {session.screen_height}
                            </div>
                          </div>
                          <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                            <div className="flex items-center gap-1.5 text-xs text-orange-700 mb-1">
                              Device
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{getDeviceIcon(session.device_type)}</span>
                              <span className="font-semibold text-gray-900 text-sm capitalize">
                                {session.device_type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Session Signals */}
                        {(session.has_rage_clicks ||
                          session.has_dead_clicks ||
                          session.has_u_turns ||
                          session.has_errors) && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="text-xs text-gray-600 mb-2 font-medium">
                              Session Signals
                            </div>
                            <SignalBadges session={session} />
                          </div>
                        )}

                        {/* Pages Toggle */}
                        <button
                          onClick={() =>
                            setExpandedSession(
                              isExpanded ? null : session.session_id
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border-t border-gray-200 pt-3"
                        >
                          <FiEye className="w-4 h-4" />
                          {isExpanded ? "Hide" : "Show"} Pages (
                          {session.page_views})
                          {isExpanded ? (
                            <FiChevronUp className="w-4 h-4" />
                          ) : (
                            <FiChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Expanded Pages */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                            {session.pages.map((page, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg"
                              >
                                <span className="text-blue-600 font-medium">
                                  {idx + 1}.
                                </span>
                                <span className="text-gray-700 truncate">
                                  {page}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
