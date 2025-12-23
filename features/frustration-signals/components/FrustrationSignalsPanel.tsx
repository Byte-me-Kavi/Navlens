'use client';

import React from 'react';
import Link from 'next/link';
import {
  FiAlertTriangle,
  FiMousePointer,
  FiRefreshCw,
} from 'react-icons/fi';
import { HiCursorClick } from 'react-icons/hi';
import { RiScrollToBottomLine } from 'react-icons/ri';
import { TbRouteOff } from 'react-icons/tb';
import { FrustrationSignalsData } from '../types/frustrationSignals.types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface FrustrationSignalsPanelProps {
  data: FrustrationSignalsData | null;
  onRefresh?: () => void;
  className?: string;
}

const DISTRIBUTION_COLORS = {
  low: '#22c55e',    // Green
  medium: '#eab308', // Yellow
  high: '#ef4444',   // Red
};

// Tooltip interface for type safety
interface FrustrationTooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    color: string;
  };
}

interface FrustrationTooltipProps {
  active?: boolean;
  payload?: FrustrationTooltipPayloadItem[];
  totalSessions: number;
}

// Custom tooltip - defined outside component to avoid creating during render
function FrustrationCustomTooltip({ active, payload, totalSessions }: FrustrationTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
        <p className="font-semibold text-gray-900 flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.payload.color }}
          ></span>
          {item.name} Frustration
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {item.value} sessions ({((item.value / totalSessions) * 100).toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
}

export function FrustrationSignalsPanel({
  data,
  onRefresh,
  className = '',
}: FrustrationSignalsPanelProps) {

  if (!data || data.totalSessions === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-gray-100 ${className}`}>
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

  // Prepare pie chart data
  const distributionData = [
    { name: 'Low', value: frustrationBreakdown.low, color: DISTRIBUTION_COLORS.low },
    { name: 'Medium', value: frustrationBreakdown.medium, color: DISTRIBUTION_COLORS.medium },
    { name: 'High', value: frustrationBreakdown.high, color: DISTRIBUTION_COLORS.high },
  ].filter(d => d.value > 0);

  // Calculate frustration level color
  const getFrustrationColor = (score: number) => {
    if (score <= 3) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' };
    if (score <= 7) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
  };

  const avgColor = getFrustrationColor(avgFrustrationScore);


  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl">
              <FiAlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Frustration Signals</h3>
              <p className="text-sm text-gray-500">{data.totalSessions} sessions analyzed</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Score and Signal Breakdown */}
        <div className="space-y-6">
          {/* Average Frustration Score */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
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
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Signal Breakdown</h4>
            <div className="grid grid-cols-2 gap-3">
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
        </div>

        {/* Right Column - Pie Chart */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Session Distribution</h4>
          <div className="h-[200px]">
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<FrustrationCustomTooltip totalSessions={data.totalSessions} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No distribution data
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4">
            {distributionData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Frustrated Sessions */}
      {topFrustratedSessions.length > 0 && (
        <div className="p-6 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Most Frustrated Sessions</h4>
          <div className="space-y-2">
            {topFrustratedSessions.slice(0, 5).map((session, idx) => (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">#{idx + 1}</span>
                  <code className="text-xs bg-white px-2 py-1 rounded-lg border border-gray-200">
                    {session.sessionId.slice(0, 12)}...
                  </code>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1" title="Dead Clicks">
                      <HiCursorClick className="w-3.5 h-3.5 text-orange-500" />
                      {session.deadClicks}
                    </span>
                    <span className="flex items-center gap-1" title="Rage Clicks">
                      <FiMousePointer className="w-3.5 h-3.5 text-red-500" />
                      {session.rageClicks}
                    </span>
                    <span className="flex items-center gap-1" title="Confusion Scrolls">
                      <RiScrollToBottomLine className="w-3.5 h-3.5 text-purple-500" />
                      {session.confusionScrolls}
                    </span>
                    <span className="flex items-center gap-1" title="Erratic Movements">
                      <TbRouteOff className="w-3.5 h-3.5 text-blue-500" />
                      {session.erraticMovements}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    getFrustrationColor(session.frustrationScore).bg
                  } ${getFrustrationColor(session.frustrationScore).text}`}>
                    {session.frustrationScore}
                  </span>
                  <Link
                    href={`/dashboard/session-replayer?sessionId=${session.sessionId}`}
                    className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-medium rounded-xl transition-colors"
                  >
                    View
                  </Link>
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
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{count.toLocaleString()}</div>
    </div>
  );
}

export default FrustrationSignalsPanel;
