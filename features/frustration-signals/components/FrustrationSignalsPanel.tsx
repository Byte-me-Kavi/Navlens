'use client';

import React from 'react';
import {
  FiAlertTriangle,
  FiMousePointer,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
} from 'react-icons/fi';
import { HiCursorClick } from 'react-icons/hi';
import { RiScrollToBottomLine } from 'react-icons/ri';
import { TbRouteOff } from 'react-icons/tb';
import { useFrustrationSignals } from '../hooks/useFrustrationSignals';

interface FrustrationSignalsPanelProps {
  siteId: string;
  pagePath: string;
  startDate?: string;
  endDate?: string;
  className?: string;
}

export function FrustrationSignalsPanel({
  siteId,
  pagePath,
  startDate,
  endDate,
  className = '',
}: FrustrationSignalsPanelProps) {
  const { data, loading, error, refetch } = useFrustrationSignals({
    siteId,
    pagePath,
    startDate,
    endDate,
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading frustration signals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-red-100 ${className}`}>
        <div className="flex items-center justify-center py-8 text-red-600">
          <FiAlertTriangle className="w-6 h-6 mr-2" />
          <span>Failed to load frustration signals</span>
          <button
            onClick={refetch}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${className}`}>
        <div className="text-center py-8">
          <FiMousePointer className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Frustration Signals Yet</h3>
          <p className="text-gray-500 text-sm">
            Frustration signals will appear once users interact with your page.
          </p>
        </div>
      </div>
    );
  }

  const { signalTotals, frustrationBreakdown, avgFrustrationScore, topFrustratedSessions } = data;

  // Calculate frustration level color
  const getFrustrationColor = (score: number) => {
    if (score <= 3) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
    if (score <= 7) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
  };

  const avgColor = getFrustrationColor(avgFrustrationScore);

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Frustration Signals</h3>
              <p className="text-sm text-gray-500">{data.totalSessions} sessions analyzed</p>
            </div>
          </div>
          <button
            onClick={refetch}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Average Frustration Score */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">Average Frustration Score</span>
          <span className={`text-2xl font-bold ${avgColor.text}`}>
            {avgFrustrationScore.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              avgFrustrationScore <= 3 ? 'bg-green-500' :
              avgFrustrationScore <= 7 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(avgFrustrationScore * 10, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Low (0)</span>
          <span>Medium (5)</span>
          <span>High (10)</span>
        </div>
      </div>

      {/* Signal Breakdown */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Signal Breakdown</h4>
        <div className="grid grid-cols-2 gap-4">
          <SignalCard
            icon={<HiCursorClick className="w-5 h-5" />}
            label="Dead Clicks"
            count={signalTotals.dead_clicks}
            color="orange"
          />
          <SignalCard
            icon={<FiMousePointer className="w-5 h-5" />}
            label="Rage Clicks"
            count={signalTotals.rage_clicks}
            color="red"
          />
          <SignalCard
            icon={<RiScrollToBottomLine className="w-5 h-5" />}
            label="Confusion Scrolls"
            count={signalTotals.confusion_scrolls}
            color="purple"
          />
          <SignalCard
            icon={<TbRouteOff className="w-5 h-5" />}
            label="Erratic Movement"
            count={signalTotals.erratic_movements}
            color="blue"
          />
        </div>
      </div>

      {/* Frustration Distribution */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Session Distribution</h4>
        <div className="flex gap-2 items-end h-20">
          <DistributionBar
            label="Low"
            count={frustrationBreakdown.low}
            total={data.totalSessions}
            color="bg-green-500"
          />
          <DistributionBar
            label="Medium"
            count={frustrationBreakdown.medium}
            total={data.totalSessions}
            color="bg-yellow-500"
          />
          <DistributionBar
            label="High"
            count={frustrationBreakdown.high}
            total={data.totalSessions}
            color="bg-red-500"
          />
        </div>
      </div>

      {/* Top Frustrated Sessions */}
      {topFrustratedSessions.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Most Frustrated Sessions</h4>
          <div className="space-y-2">
            {topFrustratedSessions.slice(0, 5).map((session, idx) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">#{idx + 1}</span>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                    {session.sessionId.slice(0, 12)}...
                  </code>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span title="Dead Clicks">💀 {session.deadClicks}</span>
                    <span title="Rage Clicks">😤 {session.rageClicks}</span>
                    <span title="Confusion Scrolls">📜 {session.confusionScrolls}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    getFrustrationColor(session.frustrationScore).bg
                  } ${getFrustrationColor(session.frustrationScore).text}`}>
                    {session.frustrationScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function SignalCard({
  icon,
  label,
  count,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'red' | 'orange' | 'purple' | 'blue';
}) {
  const colors = {
    red: 'bg-red-50 text-red-600 border-red-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{count.toLocaleString()}</div>
    </div>
  );
}

function DistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const height = Math.max(percentage, 5); // Minimum 5% height for visibility

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden h-16 flex items-end">
        <div
          className={`w-full ${color} rounded-t-lg transition-all`}
          style={{ height: `${height}%` }}
        />
      </div>
      <div className="mt-2 text-center">
        <div className="text-xs font-medium text-gray-600">{label}</div>
        <div className="text-sm font-bold text-gray-900">{count}</div>
      </div>
    </div>
  );
}

export default FrustrationSignalsPanel;
