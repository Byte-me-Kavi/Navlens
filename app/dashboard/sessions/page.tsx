"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import { apiClient } from "@/shared/services/api/client";
import { secureApi } from "@/lib/secureApi";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
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
  FiTerminal,
  FiActivity,
} from "react-icons/fi";
import { CommandLineIcon } from "@heroicons/react/24/outline";
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
  if (
    !countryCode ||
    countryCode.length !== 2 ||
    countryCode.toLowerCase() === "unknown"
  )
    return null;
  return countryCode.toUpperCase();
};

const getCountryName = (countryCode: string) => {
  try {
    if (!countryCode || countryCode.toLowerCase() === "unknown")
      return "Unknown";
    if (countryCode.length !== 2) return countryCode; // Return as-is if not a code
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

// Color palette for visitor ID highlighting
const VISITOR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-300" },
  {
    bg: "bg-fuchsia-100",
    text: "text-fuchsia-700",
    border: "border-fuchsia-300",
  },
];

// Generate consistent color for a visitor ID
const getVisitorColor = (visitorId: string) => {
  if (!visitorId) return VISITOR_COLORS[0];
  // Create a hash from the visitor ID to get consistent color
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = visitorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % VISITOR_COLORS.length;
  return VISITOR_COLORS[index];
};

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
        console.log("🔄 Calling secureApi.sessions.list with siteId:", selectedSiteId);
        const data = await secureApi.sessions.list(selectedSiteId);
        console.log("✅ Sessions data received:", data);
        const sessionData = (data.sessions as SessionData[]) || [];

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

    // Search filter (visitor ID, country name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.visitor_id?.toLowerCase().includes(query) ||
          s.country?.toLowerCase().includes(query) ||
          getCountryName(s.country)?.toLowerCase().includes(query)
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
    <div className="min-h-screen px-3 md:py-0 md:px-1">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <p className="text-gray-600 flex items-center gap-2">
            <FiEye className="w-4 h-4" />
            View and replay user sessions across your sites
          </p>
        </div>

        {/* Show NoSitesAvailable if no sites, NoSiteSelected if no site selected */}
        {loadingSites ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner message="Loading sites..." />
          </div>
        ) : sites.length === 0 ? (
          <NoSitesAvailable />
        ) : !selectedSiteId ? (
          <NoSiteSelected 
            featureName="session replays"
            description="Watch user sessions, view device info, and analyze user behavior."
          />
        ) : (
          <>
            {/* Dev Tools Promo */}
            <div className="bg-gradient-to-r from-indigo-50 to-white rounded-2xl p-5 mb-8 border border-indigo-100 flex items-start sm:items-center justify-between gap-4 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-200/40 transition-all duration-700"></div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-50 text-indigo-600">
                  <CommandLineIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Advanced Session Debugging</h3>
                  <p className="text-sm text-gray-600 max-w-xl">
                    Inspect <span className="font-semibold text-indigo-600">Console Logs</span>, monitor <span className="font-semibold text-indigo-600">Network Requests</span>, and analyze <span className="font-semibold text-indigo-600">Core Web Vitals</span> directly within the session replay player.
                  </p>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-2 relative z-10 pr-2">
                 <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm text-gray-400" title="Console">
                        <FiTerminal className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm text-gray-400" title="Network">
                        <FiGlobe className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-sm text-gray-400" title="Vitals">
                        <FiActivity className="w-4 h-4" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 md:p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <FiFilter className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Filter Sessions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Search */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pl-1">
                    Search
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="Search by visitor ID or country..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white hover:border-gray-300 shadow-sm"
                    />
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pl-1">
                    Date
                  </label>
                  <div className="relative group">
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white hover:border-gray-300 shadow-sm text-gray-700"
                    />
                    <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                </div>

                {/* Device Filter */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pl-1">
                    Device
                  </label>
                  <div className="relative group">
                    <select
                      value={deviceFilter}
                      onChange={(e) => setDeviceFilter(e.target.value)}
                      className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all bg-white hover:border-gray-300 shadow-sm cursor-pointer appearance-none text-gray-700"
                    >
                      <option value="all">All Devices</option>
                      <option value="desktop">Desktop</option>
                      <option value="tablet">Tablet</option>
                      <option value="mobile">Mobile</option>
                    </select>
                    <FiMonitor className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {(dateFilter || deviceFilter !== "all" || searchQuery) && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                    onClick={() => {
                        setDateFilter("");
                        setDeviceFilter("all");
                        setSearchQuery("");
                    }}
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                    >
                    <FiX className="w-4 h-4" />
                    Clear all filters
                    </button>
                </div>
              )}
            </div>

            {/* Sessions Count */}
            {/* Sessions Count */}
            <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 w-fit rounded-full border border-indigo-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-semibold text-indigo-700">
                Found {filteredSessions.length} sessions
              </span>
            </div>

            {/* Sessions Table */}
            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-200/60">
                <div className="inline-flex p-4 bg-indigo-50 rounded-full mb-4 ring-8 ring-indigo-50/50">
                  <FiPlay className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No sessions found
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {sessions.length === 0
                    ? "No recorded sessions yet. Sessions will appear here once visitors interact with your site."
                    : "Try adjusting your search criteria or filters to see more results."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200/60">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Page Views
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Signals
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Screen
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Browser
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Device/OS
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Visitor ID
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                              className={`hover:bg-indigo-50/30 transition-colors group ${
                                index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                              }`}
                            >
                              <td className="px-6 py-4">
                                <div className="text-xs">
                                  <div className="font-semibold text-gray-900">
                                    {date}
                                  </div>
                                  <div className="text-gray-500">{time}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {getCountryFlag(session.country) ? (
                                    <span
                                      className={`fi fi-${getCountryFlag(
                                        session.country
                                      )?.toLowerCase()}`}
                                      style={{ width: "24px", height: "18px" }}
                                    />
                                  ) : (
                                    <FiGlobe className="w-5 h-5 text-gray-400" />
                                  )}
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">
                                      {getCountryName(session.country)}
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
                                  className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors group/btn"
                                >
                                  <span className="bg-indigo-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5 group-hover/btn:bg-indigo-100 transition-colors">
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
                                <div className="text-xs text-gray-900 bg-gray-100/50 px-2 py-1 rounded-md w-fit">
                                  {session.screen_width} ×{" "}
                                  {session.screen_height}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center text-gray-800">
                                  {getBrowserIcon(session.user_agent)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    {getDeviceIcon(session.device_type)}
                                  </div>
                                  <div className="p-2 bg-gray-100 text-gray-800 rounded-lg">
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
                                {(() => {
                                  const color = getVisitorColor(
                                    session.visitor_id
                                  );
                                  return (
                                    <code
                                      className={`text-xs px-2 py-1 rounded border font-medium ${color.bg} ${color.text} ${color.border}`}
                                      title={session.visitor_id}
                                    >
                                      {session.visitor_id?.slice(0, 8)}...
                                    </code>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() =>
                                    handlePlaySession(session.session_id)
                                  }
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all hover:shadow-md hover:scale-105"
                                >
                                  <FiPlay className="w-3.5 h-3.5" />
                                  <span>Play</span>
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="px-6 py-4 bg-gray-50/50 border-t border-gray-100"
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
                        className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getCountryFlag(session.country) ? (
                              <span
                                className={`fi fi-${getCountryFlag(
                                  session.country
                                )?.toLowerCase()}`}
                                style={{ width: "32px", height: "24px" }}
                              />
                            ) : (
                              <FiGlobe className="w-6 h-6 text-gray-400" />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">
                                {getCountryName(session.country)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {date} • {time}
                              </div>
                              {/* Visitor ID Badge */}
                              {(() => {
                                const color = getVisitorColor(
                                  session.visitor_id
                                );
                                return (
                                  <code
                                    className={`text-xs px-2 py-0.5 rounded border font-medium mt-1 inline-block ${color.bg} ${color.text} ${color.border}`}
                                    title={session.visitor_id}
                                  >
                                    {session.visitor_id?.slice(0, 8)}...
                                  </code>
                                );
                              })()}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handlePlaySession(session.session_id)
                            }
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                          >
                            <FiPlay className="w-3.5 h-3.5" />
                            Play
                          </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/60">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 mb-1">
                              <FiClock className="w-3 h-3" />
                              Duration
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {formatDuration(session.duration)}
                            </div>
                          </div>
                          <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100/60">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-violet-600 mb-1">
                              <FiEye className="w-3 h-3" />
                              Page Views
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {session.page_views}
                            </div>
                          </div>
                          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/60">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mb-1">
                              <BsDisplay className="w-3 h-3" />
                              Screen
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {session.screen_width} × {session.screen_height}
                            </div>
                          </div>
                          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-200/60">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                              Device
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{getDeviceIcon(session.device_type)}</span>
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
