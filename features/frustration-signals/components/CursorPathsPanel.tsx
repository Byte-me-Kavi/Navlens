'use client';

import React, { useMemo } from 'react';
import { FiNavigation, FiTarget, FiAlertCircle, FiZap, FiRefreshCw, FiArrowRight } from 'react-icons/fi';
import { CursorPathsData, SessionPath, PatternBreakdown } from '../types/frustrationSignals.types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';

interface CursorPathsPanelProps {
  data: CursorPathsData | null;
  loading: boolean;
  error: Error | null;
  onRefresh?: () => void;
  onSessionClick?: (sessionId: string) => void;
  className?: string;
}

const PATTERN_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  color: string; 
  hexColor: string;
  label: string; 
  description: string;
  bgColor: string;
  textColor: string;
}> = {
  focused: {
    icon: <FiTarget className="w-4 h-4" />,
    color: 'green',
    hexColor: '#22c55e',
    label: 'Focused',
    description: 'Direct, purposeful movement',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  exploring: {
    icon: <FiNavigation className="w-4 h-4" />,
    color: 'blue',
    hexColor: '#3b82f6',
    label: 'Exploring',
    description: 'Normal browsing behavior',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  lost: {
    icon: <FiAlertCircle className="w-4 h-4" />,
    color: 'red',
    hexColor: '#ef4444',
    label: 'Lost',
    description: 'Erratic, confused movement',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
  },
  minimal: {
    icon: <FiZap className="w-4 h-4" />,
    color: 'gray',
    hexColor: '#6b7280',
    label: 'Minimal',
    description: 'Very little movement',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
  },
};

// Custom tooltip interface for type safety
interface CursorPathTooltipPayloadItem {
  payload: {
    pattern: string;
    count: number;
    percentage: number;
    hexColor: string;
    label: string;
    description: string;
    bgColor: string;
    textColor: string;
  };
}

interface CursorPathTooltipProps {
  active?: boolean;
  payload?: CursorPathTooltipPayloadItem[];
}

// Custom tooltip - defined outside component to avoid creating during render
function CursorPathCustomTooltip({ active, payload }: CursorPathTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 min-w-[160px]">
        <p className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: item.hexColor }}
          ></span>
          {item.label}
        </p>
        <p className="text-xs text-gray-500 mb-2">{item.description}</p>
        <p className="text-sm text-gray-600">
          Sessions: <span className="font-semibold text-gray-900">{item.count}</span>
          <span className="text-gray-400"> ({item.percentage.toFixed(1)}%)</span>
        </p>
      </div>
    );
  }
  return null;
}

export function CursorPathsPanel({
  data,
  loading,
  error,
  onRefresh,
  onSessionClick,
  className = '',
}: CursorPathsPanelProps) {
  const formatDistance = (px: number) => {
    if (px < 1000) return `${px}px`;
    return `${(px / 1000).toFixed(1)}k px`;
  };

  const patternData = useMemo(() => {
    if (!data?.patternBreakdown) return [];
    
    const breakdown = data.patternBreakdown;
    const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    
    return Object.entries(breakdown)
      .map(([pattern, count]) => ({
        pattern: pattern as keyof PatternBreakdown,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        ...PATTERN_CONFIG[pattern],
      }))
      .sort((a, b) => b.count - a.count);
  }, [data?.patternBreakdown]);

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Analyzing cursor paths...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-red-100 ${className}`}>
        <div className="text-center py-8 text-red-600">
          <span>Failed to load cursor path data</span>
        </div>
      </div>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-gray-100 ${className}`}>
        <div className="text-center py-8">
          <FiNavigation className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Cursor Path Data</h3>
          <p className="text-gray-500 text-sm">
            Cursor path analysis will appear once users navigate your page.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-xl">
              <FiNavigation className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cursor Path Analysis</h3>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <div className="text-xl font-bold text-gray-900">{formatDistance(data.avgDistance)}</div>
          <div className="text-xs text-gray-500 mt-1">Avg Distance</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <div className="text-xl font-bold text-gray-900">{data.avgDirectionChanges}</div>
          <div className="text-xs text-gray-500 mt-1">Avg Turns</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <div className={`text-xl font-bold ${data.erraticPercentage > 20 ? 'text-red-600' : 'text-gray-900'}`}>
            {data.erraticPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Erratic</div>
        </div>
      </div>

      {/* Pattern Distribution Chart */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Movement Patterns</h4>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={patternData} 
              layout="vertical"
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="label" 
                hide
                width={0}
              />
              <Tooltip content={<CursorPathCustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 4, 4]}
                barSize={24}
              >
                {patternData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hexColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4">
          {patternData.map((item) => (
            <div 
              key={item.pattern} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${item.bgColor}`}
            >
              <span className={item.textColor}>{item.icon}</span>
              <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
              <span className="text-xs font-bold text-gray-700">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Session List */}
      {data.sessions.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Sessions by Pattern</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.sessions.slice(0, 8).map((session) => (
              <SessionPathRow
                key={session.sessionId}
                session={session}
                onClick={onSessionClick ? () => onSessionClick(session.sessionId) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SessionPathRow({
  session,
  onClick,
}: {
  session: SessionPath;
  onClick?: () => void;
}) {
  const config = PATTERN_CONFIG[session.pattern] || PATTERN_CONFIG.minimal;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <code className="text-xs bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
          {session.sessionId.slice(0, 10)}...
        </code>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
          {config.icon}
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{Math.round(session.totalDistance)}px</span>
        <span>{session.directionChanges} turns</span>
        <span className="font-medium text-gray-700">
          {(session.directnessScore * 100).toFixed(0)}% direct
        </span>
        {onClick && (
          <FiArrowRight className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}

export default CursorPathsPanel;
