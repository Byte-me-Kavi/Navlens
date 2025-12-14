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
  FiArrowLeft,
  FiX,
  FiMenu,
  FiGlobe,
  FiUser,
  FiCalendar,
  FiMaximize,
  FiAlertTriangle,
  FiTerminal,
} from "react-icons/fi";
import { HiOutlineDesktopComputer } from "react-icons/hi";

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
      return <FiSmartphone className="w-5 h-5 text-blue-600" />;
    case "tablet":
      return <FiTablet className="w-5 h-5 text-blue-600" />;
    case "desktop":
      return <FiMonitor className="w-5 h-5 text-blue-600" />;
    default:
      return <HiOutlineDesktopComputer className="w-5 h-5 text-blue-600" />;
  }
};

export default function SessionReplayPage() {
  const router = useRouter();
  const params = useParams();
  const { selectedSiteId: siteId } = useSite();
  const sessionId = params["session-id"] as string;

  const [events, setEvents] = useState<RRWebEvent[]>([]);
  const [metadata, setMetadata] = useState<SessionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [userDevice, setUserDevice] = useState<"desktop" | "mobile" | "tablet">(
    "desktop"
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

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
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
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
              <FiArrowLeft className="w-4 h-4" />
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDeviceMismatch) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
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
              <FiArrowLeft className="w-4 h-4" />
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
    <div className="fixed inset-0 w-screen h-screen flex bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Collapsible Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out overflow-y-auto ${
          sidebarOpen ? "w-90" : "w-0"
        }`}
      >
        {sidebarOpen && (
          <div className="p-5">
            {/* Session Metadata */}
            {metadata && (
              <div className="space-y-3">
                <div className="border-t border-gray-200 pt-1">
                  <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border border-blue-100">
                    {getCountryFlag(metadata.country) && (
                      <span
                        className={`fi fi-${getCountryFlag(
                          metadata.country
                        )?.toLowerCase()} fis`}
                        style={{ fontSize: "1.9rem" }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-xs mb-1">
                        <FiGlobe className="w-3 h-3" />
                        Location
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {getCountryName(metadata.country)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-1">
                  <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                    <div className="p-2 bg-white rounded-lg">
                      {getDeviceIcon(metadata.device_type)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs mb-1 font-medium">
                        Device Type
                      </div>
                      <div className="text-sm font-semibold text-gray-900 capitalize">
                        {metadata.device_type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-1">
                  <div className=" bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <FiMaximize className="w-3 h-3" />
                      Screen Resolution
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {metadata.screen_width} × {metadata.screen_height}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-1">
                  <div className=" bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <FiCalendar className="w-3 h-3" />
                      Date & Time
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {date}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{time}</div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-1">
                  <div className=" bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs mb-1">
                      <FiUser className="w-3 h-3" />
                      Visitor ID
                    </div>
                    <code className="text-xs bg-white border border-gray-200 px-2 py-1 rounded block break-all">
                      {metadata.visitor_id}
                    </code>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-1">
                  <div className=" bg-gray-100 rounded-lg p-3">
                    <div className="text-xs mb-1 font-medium">IP Address</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {metadata.ip_address || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-1">
                  <div className=" bg-gray-100 rounded-lg p-3">
                    <div className="text-xs mb-1 font-medium">Platform</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {metadata.platform || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="w-full mt-6 px-4 py-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Sessions
            </button>
          </div>
        )}
      </div>

      {/* Toggle Button - Top Right */}
      <div className="absolute right-4 top-4 flex gap-2 z-10">
        {/* Dev Tools Button */}
        <button
          onClick={() => setDebugPanelOpen(!debugPanelOpen)}
          className={`bg-white hover:bg-gray-50 border rounded-lg px-3 py-2.5 shadow-lg transition-all hover:shadow-xl flex items-center gap-2 ${
            debugPanelOpen
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300"
          }`}
          title={debugPanelOpen ? "Hide Dev Tools" : "Show Dev Tools"}
        >
          <FiTerminal
            className={`w-5 h-5 ${
              debugPanelOpen ? "text-blue-600" : "text-gray-700"
            }`}
          />
          <span
            className={`text-sm font-medium ${
              debugPanelOpen ? "text-blue-600" : "text-gray-700"
            }`}
          >
            Dev Tools
          </span>
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 shadow-lg transition-all hover:shadow-xl"
          title={sidebarOpen ? "Hide session info" : "Show session info"}
        >
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <FiX className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Close</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FiMenu className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">
                Session Info
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Player Container - Centered with increased height */}
      <div className="flex-1 p-0 bg-transparent flex flex-col items-center overflow-hidden h-screen">
        <div className="flex-1 w-full h-5/6 px-2 flex flex-col justify-center items-center max-w-5xl bg-transparent">
          {events.length > 0 ? (
            <div className="w-full h-full rounded-lg shadow-2xl overflow-hidden">
              <SessionPlayer events={events} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
                <div className="inline-flex p-4 bg-linear-to-br from-gray-50 to-gray-100 rounded-full mb-4">
                  <FiAlertTriangle className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Events Found
                </h3>
                <p className="text-gray-600">
                  This session has no recorded events to replay.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      {siteId && (
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
      )}
    </div>
  );
}
