"use client";

import React from "react";
import { 
    DevicePhoneMobileIcon,
    ComputerDesktopIcon,
    DeviceTabletIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon
} from "@heroicons/react/24/outline";

interface DeviceMetrics {
  device_type: string;
  sessions: number;
  visitors: number;
  avg_duration: number;
  bounce_rate: number;
  rage_clicks: number;
  dead_clicks: number;
}

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'mobile':
      return <DevicePhoneMobileIcon className="w-6 h-6" />;
    case 'tablet':
      return <DeviceTabletIcon className="w-6 h-6" />;
    default:
      return <ComputerDesktopIcon className="w-6 h-6" />;
  }
};

const formatDuration = (seconds: number) => {
  // Duration from sessions_view is already in SECONDS
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const GradeIndicator = ({ score }: { score: number }) => {
  let grade = 'A';
  let color = 'text-green-600 bg-green-100';
  
  if (score < 40) {
    grade = 'F';
    color = 'text-red-600 bg-red-100';
  } else if (score < 60) {
    grade = 'D';
    color = 'text-orange-600 bg-orange-100';
  } else if (score < 75) {
    grade = 'C';
    color = 'text-amber-600 bg-amber-100';
  } else if (score < 90) {
    grade = 'B';
    color = 'text-blue-600 bg-blue-100';
  }

  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${color}`}>
      {grade}
    </span>
  );
};

// Session data type from server (matches sessions_view schema)
interface SessionData {
  session_id: string;
  visitor_id: string;
  started_at: string;
  duration: number;
  page_views: number;
  device_type: string;
  country?: string;
  signals?: Array<{ type: string }>;
}

interface ReportMobileAuditWrapperProps {
  siteId: string;
  days: number;
  sessionsData: SessionData[];
}

export default function ReportMobileAuditWrapper({ siteId, days, sessionsData }: ReportMobileAuditWrapperProps) {
  // Process server-provided sessionsData directly (no client-side fetch needed)
  const deviceMetrics = React.useMemo(() => {
    // Aggregate metrics by device type
    const deviceMap: Record<string, DeviceMetrics> = {
      desktop: { device_type: 'desktop', sessions: 0, visitors: 0, avg_duration: 0, bounce_rate: 0, rage_clicks: 0, dead_clicks: 0 },
      mobile: { device_type: 'mobile', sessions: 0, visitors: 0, avg_duration: 0, bounce_rate: 0, rage_clicks: 0, dead_clicks: 0 },
      tablet: { device_type: 'tablet', sessions: 0, visitors: 0, avg_duration: 0, bounce_rate: 0, rage_clicks: 0, dead_clicks: 0 },
    };

    const visitorsByDevice: Record<string, Set<string>> = {
      desktop: new Set(),
      mobile: new Set(),
      tablet: new Set(),
    };

    const totalDurationByDevice: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    const bouncedSessionsByDevice: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };

    for (const session of sessionsData) {
      const deviceType = (session.device_type || 'desktop').toLowerCase();
      const normalizedType = deviceType.includes('mobile') || deviceType.includes('phone') ? 'mobile' :
                             deviceType.includes('tablet') ? 'tablet' : 'desktop';
      
      if (!deviceMap[normalizedType]) continue;

      // Extract rage_clicks and dead_clicks from signals array
      const signals = session.signals || [];
      const sessionRageClicks = signals.filter(s => s.type === 'rage_click').length;
      const sessionDeadClicks = signals.filter(s => s.type === 'dead_click').length;

      deviceMap[normalizedType].sessions++;
      deviceMap[normalizedType].rage_clicks += sessionRageClicks;
      deviceMap[normalizedType].dead_clicks += sessionDeadClicks;
      totalDurationByDevice[normalizedType] += session.duration || 0;

      // Track bounced sessions (sessions with 1 or fewer page views)
      if ((session.page_views || 0) <= 1) {
        bouncedSessionsByDevice[normalizedType]++;
      }

      if (session.visitor_id) {
        visitorsByDevice[normalizedType].add(session.visitor_id);
      }
    }

    // Calculate averages, visitor counts, and bounce rate
    for (const type of ['desktop', 'mobile', 'tablet']) {
      deviceMap[type].visitors = visitorsByDevice[type].size;
      deviceMap[type].avg_duration = deviceMap[type].sessions > 0 
        ? totalDurationByDevice[type] / deviceMap[type].sessions 
        : 0;
      // Calculate bounce rate as percentage
      deviceMap[type].bounce_rate = deviceMap[type].sessions > 0
        ? (bouncedSessionsByDevice[type] / deviceMap[type].sessions) * 100
        : 0;
    }

    return Object.values(deviceMap).filter(d => d.sessions > 0);
  }, [sessionsData]);

  if (!sessionsData || sessionsData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
        <DevicePhoneMobileIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No Session Data Available</p>
        <p className="text-gray-500 text-sm mt-1">
          Mobile usability analysis requires session data from the selected date range.
        </p>
      </div>
    );
  }

  const mobile = deviceMetrics.find(d => d.device_type.toLowerCase() === 'mobile');
  const desktop = deviceMetrics.find(d => d.device_type.toLowerCase() === 'desktop');
  const tablet = deviceMetrics.find(d => d.device_type.toLowerCase() === 'tablet');

  const totalSessions = deviceMetrics.reduce((sum, d) => sum + d.sessions, 0);
  const mobilePercentage = mobile && totalSessions > 0 ? Math.round((mobile.sessions / totalSessions) * 100) : 0;

  // Calculate mobile usability score (based on friction signals)
  const mobileScore = mobile ? Math.max(0, Math.min(100, 100 - (mobile.rage_clicks + mobile.dead_clicks) * 2 - mobile.bounce_rate / 2)) : 50;

  // Generate insights
  const insights: { type: 'success' | 'warning' | 'error'; message: string }[] = [];

  if (mobile && desktop) {
    if (mobile.bounce_rate > desktop.bounce_rate + 10) {
      insights.push({
        type: 'error',
        message: `Mobile bounce rate is ${Math.round(mobile.bounce_rate - desktop.bounce_rate)}% higher than desktop. Check mobile layout and load times.`
      });
    }
    if (mobile.rage_clicks > desktop.rage_clicks * 1.5) {
      insights.push({
        type: 'warning',
        message: `Mobile users show ${Math.round((mobile.rage_clicks / (desktop.rage_clicks || 1) - 1) * 100)}% more frustration signals. Review tap target sizes.`
      });
    }
    if (mobile.avg_duration < desktop.avg_duration * 0.7) {
      insights.push({
        type: 'warning',
        message: `Mobile session duration is significantly shorter. Users may be abandoning due to UX issues.`
      });
    }
  }

  if (mobilePercentage > 50) {
    insights.push({
      type: 'success',
      message: `${mobilePercentage}% of your traffic is mobile. Mobile optimization is critical for this audience.`
    });
  }

  if (insights.length === 0 && mobile) {
    insights.push({
      type: 'success',
      message: `Mobile experience appears stable with no major friction signals detected.`
    });
  }

  return (
    <div className="space-y-6">
      {/* Device Breakdown Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[desktop, mobile, tablet].filter(Boolean).map((device) => (
          <div 
            key={device!.device_type} 
            className={`bg-white rounded-xl border p-5 ${device!.device_type === 'mobile' ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100'}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${device!.device_type === 'mobile' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                <DeviceIcon type={device!.device_type} />
              </div>
              <div>
                <div className="font-bold text-gray-900 capitalize">{device!.device_type}</div>
                <div className="text-xs text-gray-500">{device!.sessions.toLocaleString()} sessions</div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Avg Duration</span>
                <span className="font-medium text-gray-900">{formatDuration(device!.avg_duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bounce Rate</span>
                <span className="font-medium text-gray-900">{device!.bounce_rate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frustration Events</span>
                <span className={`font-medium ${device!.rage_clicks > 10 ? 'text-rose-600' : 'text-gray-900'}`}>
                  {device!.rage_clicks + device!.dead_clicks}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Score */}
      {mobile && mobile.sessions > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-6">
          <GradeIndicator score={mobileScore} />
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 mb-1">Mobile Usability Score</h4>
            <p className="text-sm text-gray-500">
              Based on frustration signals, bounce rate, and engagement metrics across {mobile.sessions.toLocaleString()} mobile sessions.
            </p>
          </div>
          <div className="text-3xl font-bold text-indigo-600">{Math.round(mobileScore)}/100</div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Mobile Insights</h4>
          {insights.map((insight, i) => {
            const Icon = insight.type === 'error' ? XCircleIcon : 
                         insight.type === 'warning' ? ExclamationTriangleIcon : 
                         CheckCircleIcon;
            const colors = insight.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                          insight.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                          'bg-green-50 border-green-100 text-green-800';
            
            return (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${colors}`}>
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{insight.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
