"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
import { useDebugData } from "@/features/dev-tools/hooks/useDebugData";
import { TimelineMarker } from "@/features/dev-tools/types/devtools.types";
import { useAI } from "@/context/AIProvider";
import { summarizeRRWebEvents } from "@/lib/ai/sanitizer";
import { cleanRRWebEvents } from "@/lib/utils/rrweb";

interface SessionSignal {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

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
  duration?: number;
  signals?: SessionSignal[];
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

  const [debugPanelOpen, setDebugPanelOpen] = useState(true);
  // Removed infoBarOpen state as per request
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [highlightedEvent, setHighlightedEvent] = useState<{ timestamp: number; type: string } | null>(null);

  const handleMarkerClick = (marker: TimelineMarker) => {
      setDebugPanelOpen(true);
      setHighlightedEvent({ timestamp: marker.timestamp, type: marker.type });
      // Clear after delay to allow re-trigger
      setTimeout(() => setHighlightedEvent(null), 2500); 
  };

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
      
      // Clean and sort events
      const rawEvents = (replayData.events as RRWebEvent[]) || [];
      const sanitizedEvents = cleanRRWebEvents(rawEvents);
      
      setEvents(sanitizedEvents);

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

  // Fetch debug data first to check for network/console timestamps
  const { data: debugData, markers } = useDebugData({
    sessionId: params["session-id"] as string,
    siteId: currentSite?.id || "",
    // We pass 0 initially because we need the data to calculate the TRUE start time
    sessionStartTime: 0, 
    enabled: !!currentSite?.id,
  });

  // Determine TRUE session start time
  const sessionStartTime = useMemo(() => {
    let startTime = Date.now();
    let hasSetStart = false;

    // 1. Try first rrweb event
    if (events.length > 0) {
      startTime = events[0].timestamp;
      hasSetStart = true;
    }

    // 2. Check if metadata is earlier
    if (metadata?.timestamp) {
        const metaTime = new Date(metadata.timestamp).getTime();
        if (!hasSetStart || metaTime < startTime) {
            startTime = metaTime;
            hasSetStart = true;
        }
    }

    // 3. Check if any network/console events are earlier (to avoid 00:00.000)
    if (debugData) {
        if (debugData.network && debugData.network.length > 0) {
             // Find earliest network request
             const earliestNetwork = Math.min(...debugData.network.map(n => new Date(n.timestamp).getTime()));
             if (earliestNetwork < startTime) startTime = earliestNetwork;
        }
        if (debugData.console && debugData.console.length > 0) {
             const earliestConsole = Math.min(...debugData.console.map(c => new Date(c.timestamp).getTime()));
             if (earliestConsole < startTime) startTime = earliestConsole;
        }
    }
    
    return startTime;
  }, [metadata, events, debugData]);

  // Re-calculate markers with correct sessionStartTime
  // We utilize a memosized transformation here since the hook was initialized with 0
  const realMarkers = useMemo(() => {
      if (!debugData) return [];
      // Manually import createTimelineMarkers logic or rely on the hook update?
      // The hook uses 'sessionStartTime' prop. 
      // Issue: We can't pass the calculated sessionStartTime to the hook because the hook *provides* the data needed to calculate it.
      // Solution: We must recalculate markers here locally, OR update the hook to accept raw data.
      // Let's recalculate locally for safety.
      
      const newMarkers: TimelineMarker[] = [];
      
      debugData.console.forEach(event => {
          if (event.console_level === 'error') {
              newMarkers.push({
                  timestamp: new Date(event.timestamp).getTime() - sessionStartTime,
                  type: 'error',
                  label: 'JS Error',
                  details: event.console_message
              });
          }
      });
      
      debugData.network.forEach(event => {
          if (event.network_status >= 400 || event.network_status === 0) {
              newMarkers.push({
                  timestamp: new Date(event.timestamp).getTime() - sessionStartTime,
                  type: 'network-error',
                  label: 'Network Error',
                  details: `${event.network_method} ${event.network_status}`
              });
          }
      });

      return newMarkers;
  }, [debugData, sessionStartTime]);

  // Create markers from session signals
  const signalMarkers = useMemo(() => {
    if (!metadata?.signals) return [];
    
    return metadata.signals.map((signal) => {
        let type: TimelineMarker['type'] | undefined;
        let label = 'Signal';
        
        if (signal.type === 'rage_click') {
            type = 'rage-click';
            label = 'Rage Click';
        } else if (signal.type === 'dead_click') {
            type = 'dead-click';
            label = 'Dead Click';
        }
        
        if (!type) return null;

        const timestamp = new Date(signal.timestamp).getTime() - sessionStartTime;
        
        return {
            timestamp,
            type,
            label,
            details: JSON.stringify(signal.data)
        } as TimelineMarker;
    }).filter((m): m is TimelineMarker => m !== null);
  }, [metadata, sessionStartTime]);

  const allMarkers = useMemo(() => {
     return [...realMarkers, ...signalMarkers].sort((a, b) => a.timestamp - b.timestamp);
  }, [realMarkers, signalMarkers]);

  const duration = useMemo(() => {
    if (!metadata) return 0;
    return metadata.duration || 0;
  }, [metadata]);

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const { date, time } = metadata?.timestamp
    ? formatDateTime(metadata.timestamp)
    : { date: "", time: "" };

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

  return (
    <div className="h-screen flex flex-col bg-gray-50/50">
      {/* Enhanced Navbar */}
      <div className="flex-none z-50">
        <div className="bg-white/80 backdrop-blur-md border-b border-indigo-100 px-6 py-1 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-indigo-50 rounded-xl transition-colors text-gray-500 hover:text-indigo-600"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Session Replay
              </h1>
              <div className="flex items-center gap-2 text-xs font-medium">
                  {currentSite && (
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          {currentSite.domain}
                      </span>
                  )}
              </div>
          </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Info Badges - Modernized */}
             {metadata && (
                 <div className="hidden md:flex items-center gap-3 text-xs font-medium text-gray-600">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full shadow-sm">
                         <span className="text-indigo-600/70 font-semibold">Started</span>
                         <span className="text-indigo-900 font-bold">{new Date(metadata.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full shadow-sm">
                         <span className="text-indigo-600/70 font-semibold">Date</span>
                         <span className="text-indigo-900 font-bold">{new Date(metadata.timestamp).toLocaleDateString()}</span>
                    </div>
                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full shadow-sm">
                         <span className="text-indigo-600/70 font-semibold">IP</span>
                         <span className="text-indigo-900 font-bold font-mono">{metadata.ip_address || "Unknown"}</span>
                    </div>

                    <div className="h-4 w-px bg-gray-200 mx-1"></div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full shadow-sm">
                        <span className="font-mono text-indigo-600/70 text-[10px] font-semibold">ID</span>
                        <span className="font-bold text-indigo-900 font-mono tracking-tight">{metadata.visitor_id.substring(0, 8)}</span>
                    </div>
                     <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full shadow-sm text-indigo-900">
                        {getDeviceIcon(metadata.device_type)}
                        <span className="font-semibold">{metadata.device_type}</span>
                    </div>
                    {metadata.country && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full shadow-sm text-xs font-medium text-indigo-900">
                            <span className={`fi fi-${metadata.country.toLowerCase()} rounded-full scale-110 shadow-sm`} />
                            <span className="font-semibold">{getCountryName(metadata.country)}</span>
                        </div>
                    )}
                 </div>
             )}

            <button
              onClick={() => handleAIAnalysis()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-medium text-sm hover:scale-105 active:scale-95"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>AI Insights</span>
            </button>
            {/* Info Button Removed */}
            <button
              onClick={() => setDebugPanelOpen(!debugPanelOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all text-sm font-medium border border-indigo-100 ${debugPanelOpen ? 'bg-indigo-100 ring-2 ring-indigo-200' : ''}`}
            >
               <CommandLineIcon className="w-4 h-4" />
               <span>Dev Tools</span>
            </button>
            </div>
          </div>
        </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Player Container - Full Width */}
        <div className="flex-1 p-0.5 flex items-center justify-center overflow-hidden bg-white/50 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
          <div className="w-full h-full max-w-6xl flex items-center justify-center relative z-10">
            {events.length > 0 ? (
               <div className="w-full h-full rounded-2xl shadow-2xl shadow-indigo-200/50 overflow-hidden border border-gray-200/50 bg-white ring-1 ring-gray-900/5">
                <SessionPlayer 
                    events={events} 
                    markers={allMarkers} 
                    onMarkerClick={handleMarkerClick}
                />
              </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100 max-w-md">
                <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4 ring-8 ring-gray-50/50">
                  <FiAlertTriangle className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Events Found
                </h3>
                <p className="text-gray-500">
                  This session has no recorded events to replay.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel Removed */}

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
              sessionStartTime={sessionStartTime}
              isOpen={debugPanelOpen}
              onClose={() => setDebugPanelOpen(false)}
              highlightedEvent={highlightedEvent}
              signals={metadata?.signals || []} // Pass signals here
            />
          </div>
        )}
      </div>
    </div>
  );
}
