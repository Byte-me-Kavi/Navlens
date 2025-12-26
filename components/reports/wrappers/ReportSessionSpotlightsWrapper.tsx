"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { 
    PlayCircleIcon,
    ExclamationTriangleIcon,
    CursorArrowRaysIcon,
    CheckCircleIcon,
    ClockIcon
} from "@heroicons/react/24/outline";

// Dynamically import session player to avoid SSR issues with rrweb
const ReportSessionPlayer = dynamic(
  () => import("@/components/reports/ReportSessionPlayer"),
  { ssr: false }
);

interface SessionSpotlight {
  session_id: string;
  visitor_id: string;
  created_at: string;
  duration: number;
  page_views: number;
  device_type: string;
  country?: string;
  spotlight_reason: string;
  rage_clicks: number;
  dead_clicks: number;
  errors: number;
  converted: boolean;
}

const SpotlightBadge = ({ reason }: { reason: string }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
    rage_click: { bg: "bg-rose-100", text: "text-rose-700", icon: CursorArrowRaysIcon },
    error: { bg: "bg-red-100", text: "text-red-700", icon: ExclamationTriangleIcon },
    conversion: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircleIcon },
    long_session: { bg: "bg-blue-100", text: "text-blue-700", icon: ClockIcon },
    recent: { bg: "bg-gray-100", text: "text-gray-700", icon: PlayCircleIcon },
  };

  const cfg = config[reason] || config.recent;
  const Icon = cfg.icon;

  const labels: Record<string, string> = {
    rage_click: "User Frustration",
    error: "Encountered Error",
    conversion: "Successful Conversion",
    long_session: "High Engagement",
    recent: "Recent Session",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {labels[reason] || reason}
    </span>
  );
};

const formatDuration = (seconds: number) => {
  // Duration from sessions_view is already in SECONDS
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
};

// Session data type from server (matches sessions_view schema)
interface ServerSessionData {
  session_id: string;
  visitor_id: string;
  started_at: string;
  duration: number;
  page_views: number;
  device_type: string;
  country?: string;
  signals?: Array<{ type: string }>;
}

interface ReportSessionSpotlightsWrapperProps {
  siteId: string;
  days: number;
  sessionsData: ServerSessionData[];
  shareToken?: string;
}

export default function ReportSessionSpotlightsWrapper({ siteId, days: _days, sessionsData, shareToken: _shareToken }: ReportSessionSpotlightsWrapperProps) {
  // Modal state for embedded session player
  const [activeSession, setActiveSession] = useState<string | null>(null);

  // Process server-provided sessionsData directly (no client-side fetch needed)
  const spotlights = React.useMemo(() => {
    // Curate spotlights - prioritize sessions with any notable characteristics
    const curated: SessionSpotlight[] = [];
    const regularSessions: SessionSpotlight[] = [];
    
    for (const session of sessionsData) {
      // Extract signal counts from the signals array
      const signals = session.signals || [];
      const rageClicks = signals.filter(s => s.type === 'rage_click').length;
      const deadClicks = signals.filter(s => s.type === 'dead_click').length;
      const errors = signals.filter(s => ['js_error', 'console_error', 'unhandled_rejection'].includes(s.type)).length;
      const duration = session.duration || 0;
      const pageViews = session.page_views || 1;

      let reason = '';
      // Relaxed thresholds - any frustration signal counts
      if (rageClicks >= 1) reason = 'rage_click';
      else if (errors > 0) reason = 'error';
      else if (deadClicks >= 2) reason = 'rage_click'; // Dead clicks also count
      else if (duration > 60) reason = 'long_session'; // 1+ minute (duration is in seconds)
      else if (pageViews >= 3) reason = 'long_session'; // Multi-page sessions

      const sessionData: SessionSpotlight = {
        session_id: session.session_id,
        visitor_id: session.visitor_id,
        created_at: session.started_at,
        duration: duration,
        page_views: pageViews,
        device_type: session.device_type || 'unknown',
        country: session.country,
        spotlight_reason: reason || 'recent',
        rage_clicks: rageClicks,
        dead_clicks: deadClicks,
        errors: errors,
        converted: false,
      };

      if (reason) {
        curated.push(sessionData);
      } else {
        regularSessions.push(sessionData);
      }

      if (curated.length >= 5) break;
    }

    // If we don't have enough notable sessions, fill with recent ones
    if (curated.length < 5 && regularSessions.length > 0) {
      const remaining = 5 - curated.length;
      curated.push(...regularSessions.slice(0, remaining));
    }

    return curated;
  }, [sessionsData]);

  if (!sessionsData || sessionsData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
        <PlayCircleIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No Sessions Found</p>
        <p className="text-gray-500 text-sm mt-1">
          Session replays help identify specific user struggles and conversion paths.
        </p>
      </div>
    );
  }

  if (spotlights.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
        <PlayCircleIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No Notable Sessions Found</p>
        <p className="text-gray-500 text-sm mt-1">
          Session replays help identify specific user struggles and conversion paths.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Session Player Modal */}
      {activeSession && (
        <ReportSessionPlayer
          siteId={siteId}
          sessionId={activeSession}
          onClose={() => setActiveSession(null)}
        />
      )}

      <div className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Curated replays demonstrating specific user behaviors. Click to watch the full session.
        </p>
        
        {spotlights.map((spotlight, index) => (
          <div 
            key={spotlight.session_id} 
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow group break-inside-avoid"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      Session #{(spotlight.session_id || 'unknown').slice(0, 8)}
                    </span>
                    <SpotlightBadge reason={spotlight.spotlight_reason} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{new Date(spotlight.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{formatDuration(spotlight.duration)}</span>
                    <span>•</span>
                    <span>{spotlight.page_views} pages</span>
                    <span>•</span>
                    <span className="capitalize">{spotlight.device_type}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setActiveSession(spotlight.session_id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <PlayCircleIcon className="w-4 h-4" />
                Watch
              </button>
            </div>

            {/* Quick Stats */}
            {(spotlight.rage_clicks > 0 || spotlight.errors > 0) && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs">
                {spotlight.rage_clicks > 0 && (
                  <span className="text-rose-600">
                    {spotlight.rage_clicks} rage clicks
                  </span>
                )}
                {spotlight.dead_clicks > 0 && (
                  <span className="text-gray-500">
                    {spotlight.dead_clicks} dead clicks
                  </span>
                )}
                {spotlight.errors > 0 && (
                  <span className="text-red-600">
                    {spotlight.errors} errors
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
