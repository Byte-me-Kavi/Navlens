"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import SessionPlayer, { RRWebEvent } from "@/components/SessionPlayer";
import { secureApi } from "@/lib/secureApi";
import { DebugPanel } from "@/features/dev-tools";
import "flag-icons/css/flag-icons.min.css";
import countries from "world-countries";
import {
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiGlobe,
  FiUser,
  FiCalendar,
  FiMaximize,
  FiAlertTriangle,
} from "react-icons/fi";
import { HiOutlineDesktopComputer } from "react-icons/hi";
import {
  ArrowLeftIcon,
  SparklesIcon,
  CommandLineIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAI } from "@/context/AIProvider";
import { summarizeRRWebEvents } from "@/lib/ai/sanitizer";

interface SessionMetadata {
  visitor_id: string;
  timestamp: string;
  country: string;
  ip_address: string;
  device_type: string;
  screen_width: number;
  screen_height: number;
  platform: string;
  user_agent: string;
  page_path: string;
  viewport_width: number;
  viewport_height: number;
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
      return <FiSmartphone className="w-4 h-4" />;
    case "tablet":
      return <FiTablet className="w-4 h-4" />;
    case "desktop":
      return <FiMonitor className="w-4 h-4" />;
    default:
      return <HiOutlineDesktopComputer className="w-4 h-4" />;
  }
};

export default function SessionReplayPage() {
  const router = useRouter();
  const params = useParams();
  const { selectedSiteId: siteId, getSiteById } = useSite();
  const { openChat } = useAI();
  const sessionId = params["session-id"] as string;

  const [events, setEvents] = useState<RRWebEvent[]>([]);
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [userDevice, setUserDevice] = useState<"desktop" | "mobile" | "tablet">(
    "desktop"
  );

  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [infoBarOpen, setInfoBarOpen] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

  // Get current site details
  const currentSite = siteId ? getSiteById(siteId) : null;

  // Handle AI analysis
  const handleAIAnalysis = () => {
    const eventSummary = summarizeRRWebEvents(events as Parameters<typeof summarizeRRWebEvents>[0]);
    openChat('session', {
      sessionId,
      metadata,
      eventSummary,
      totalEvents: events.length,
      autoMessage: 'Give me a brief summary of this session - what did the user do, any frustrations, and key insights.',
    });
  };

  // Detect user's device type
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width < 768) return "mobile";
      else if (width < 1024) return "tablet";
      else return "desktop";
    };
    setUserDevice(detectDevice());
  }, []);

  const fetchSessionReplay = useCallback(async () => {
    try {
      if (!siteId) return;
      setLoading(true);
      setError("");

      // Fetch stitched events from replay API
      const replayData = await secureApi.sessions.replayEvents(sessionId, siteId);
      setEvents((replayData.events as RRWebEvent[]) || []);

      // Fetch session metadata
      const metaData = await secureApi.sessions.get(sessionId, siteId);
      setMetadata(metaData.session as SessionMetadata);
    } catch (err: unknown) {
      console.error("Error fetching session:", err);
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [siteId, sessionId]);

  useEffect(() => {
    if (!siteId || !sessionId) {
      router.push("/dashboard/sessions");
      return;
    }

    fetchSessionReplay();
  }, [siteId, sessionId, fetchSessionReplay, router]);

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading session replay..." />
      </div>
    );
  }

  // Check if user's device matches session device type
  const isDeviceMismatch =
    metadata &&
    userDevice !== "desktop" &&
    metadata.device_type?.toLowerCase() !== userDevice?.toLowerCase();

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-red-100">
            <div className="inline-flex p-4 bg-red-50 rounded-full mb-4">
              <FiAlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Session
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDeviceMismatch) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-orange-100">
            <div className="inline-flex p-4 bg-orange-50 rounded-full mb-4">
              <FiSmartphone className="w-12 h-12 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Device Type Mismatch
            </h3>
            <p className="text-gray-600 mb-6">
              This session was recorded on a{" "}
              <strong>{metadata?.device_type}</strong> device, but you&apos;re
              viewing on a <strong>{userDevice}</strong> device.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Mobile users can only watch mobile session replays. Please switch
              to a desktop or view this session from another device.
            </p>
            <button
              onClick={() => router.push("/dashboard/sessions")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { date, time } = metadata
    ? formatDateTime(metadata.timestamp)
    : { date: "", time: "" };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Enhanced Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm relative">
        {/* Main Controls Row */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back & Site Info */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 hover:text-gray-900 transition-colors flex-shrink-0"
                title="Back to Sessions"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              
              <div className="min-w-0 hidden md:block">
                <h1 className="text-base font-bold text-gray-900">
                  Session Replay
                </h1>
                <p className="text-xs text-gray-500 truncate">
                  {currentSite?.site_name || "Session Player"}
                </p>
              </div>
            </div>

            {/* Center: Session Info */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              {metadata && (
                <>
                  {/* Session ID */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium text-gray-500">Session:</span>
                    <code className="text-xs font-mono text-gray-900">
                      {sessionId.slice(0, 8)}...
                    </code>
                  </div>

                  {/* Device Type */}
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    {getDeviceIcon(metadata.device_type)}
                    <span className="text-xs font-semibold text-blue-900 capitalize hidden sm:inline">
                      {metadata.device_type}
                    </span>
                  </div>

                  {/* Country Flag */}
                  {getCountryFlag(metadata.country) && (
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <span
                        className={`fi fi-${getCountryFlag(metadata.country)?.toLowerCase()}`}
                        style={{ fontSize: "1rem" }}
                      />
                      <span className="text-xs font-medium text-gray-700 hidden lg:inline">
                        {getCountryName(metadata.country)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* AI Analysis Button */}
              <button
                onClick={handleAIAnalysis}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg text-white transition-all shadow-sm"
                title="AI Analysis"
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-semibold">Navlens AI</span>
              </button>
              {/* Info Toggle Button */}
              <button
                onClick={() => setInfoBarOpen(!infoBarOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                  infoBarOpen
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                title="Session Details"
              >
                <InformationCircleIcon className="w-4 h-4" />
                <span className="hidden md:inline text-xs font-semibold">Info</span>
              </button>

              {/* Dev Tools Toggle */}
              <button
                onClick={() => setDebugPanelOpen(!debugPanelOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                  debugPanelOpen
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                title="Dev Tools"
              >
                <CommandLineIcon className="w-4 h-4" />
                <span className="hidden lg:inline text-xs font-semibold">Dev Tools</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Info Bar - Toggled with Button */}
        {metadata && infoBarOpen && (
          <div className="absolute top-full left-0 right-0 z-50 px-4 py-3 bg-white border-t border-b border-gray-200 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {/* Location */}
              <div className="flex items-center gap-1.5">
                <FiGlobe className="w-3 h-3 text-blue-600" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Location</div>
                  <div className="font-semibold text-gray-900 truncate" title={getCountryName(metadata.country)}>
                    {getCountryName(metadata.country)}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-1.5">
                <FiCalendar className="w-3 h-3 text-blue-600" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Date</div>
                  <div className="font-semibold text-gray-900">{date}</div>
                </div>
              </div>

              {/* Platform */}
              <div className="flex items-center gap-1.5">
                <FiMonitor className="w-3 h-3 text-blue-600" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Platform</div>
                  <div className="font-semibold text-gray-900 truncate" title={metadata.platform || "N/A"}>
                    {metadata.platform || "N/A"}
                  </div>
                </div>
              </div>

              {/* Resolution */}
              <div className="flex items-center gap-1.5">
                <FiMaximize className="w-3 h-3 text-blue-600" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Screen</div>
                  <div className="font-semibold text-gray-900">
                    {metadata.screen_width} × {metadata.screen_height}
                  </div>
                </div>
              </div>

              {/* IP Address */}
              <div className="flex items-center gap-1.5">
                <span className="text-blue-600 text-xs">🌐</span>
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">IP</div>
                  <div className="font-semibold text-gray-900 truncate" title={metadata.ip_address || "N/A"}>
                    {metadata.ip_address || "N/A"}
                  </div>
                </div>
              </div>

              {/* Visitor ID */}
              <div className="flex items-center gap-1.5">
                <FiUser className="w-3 h-3 text-blue-600" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase font-medium">Visitor</div>
                  <code className="font-mono font-semibold text-gray-900 text-[10px]" title={metadata.visitor_id}>
                    {metadata.visitor_id.slice(0, 8)}...
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Player Container - Full Width */}
        <div className="flex-1 p-2 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="w-full h-full max-w-6xl flex items-center justify-center">
            {events.length > 0 ? (
              <div className="w-full h-full rounded-lg shadow-2xl overflow-hidden">
                <SessionPlayer events={events} />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
                <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                  <FiAlertTriangle className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Events Found
                </h3>
                <p className="text-gray-600">
                  This session has no recorded events to replay.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dev Tools Panel - Right */}
        {siteId && (
          <div
            className={`transition-all duration-300 ease-in-out ${
              debugPanelOpen ? "w-96" : "w-0"
            }`}
          >
            <DebugPanel
              sessionId={sessionId}
              siteId={siteId}
              currentTime={currentPlaybackTime}
              sessionStartTime={
                events.length > 0 ? events[0].timestamp : Date.now()
              }
              isOpen={debugPanelOpen}
              onClose={() => setDebugPanelOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
