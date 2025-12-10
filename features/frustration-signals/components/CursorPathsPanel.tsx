'use client';

import React, { useMemo } from 'react';
import { FiNavigation, FiTarget, FiAlertCircle, FiZap, FiRefreshCw } from 'react-icons/fi';
import { CursorPathsData, SessionPath, PatternBreakdown } from '../types/frustrationSignals.types';

interface CursorPathsPanelProps {
  data: CursorPathsData | null;
  loading: boolean;
  error: Error | null;
  onRefresh?: () => void;
  onSessionClick?: (sessionId: string) => void;
  className?: string;
}

const PATTERN_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; description: string }> = {
  focused: {
    icon: <FiTarget className="w-4 h-4" />,
    color: 'green',
    label: 'Focused',
    description: 'Direct, purposeful movement',
  },
  exploring: {
    icon: <FiNavigation className="w-4 h-4" />,
    color: 'blue',
    label: 'Exploring',
    description: 'Normal browsing behavior',
  },
  lost: {
    icon: <FiAlertCircle className="w-4 h-4" />,
    color: 'red',
    label: 'Lost',
    description: 'Erratic, confused movement',
  },
  minimal: {
    icon: <FiZap className="w-4 h-4" />,
    color: 'gray',
    label: 'Minimal',
    description: 'Very little movement',
  },
};

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
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Analyzing cursor paths...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-red-100 ${className}`}>
        <div className="text-center py-8 text-red-600">
          <span>Failed to load cursor path data</span>
        </div>
      </div>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${className}`}>
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
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <FiNavigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cursor Path Analysis</h3>
              <p className="text-sm text-gray-500">{data.totalSessions} sessions analyzed</p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatDistance(data.avgDistance)}</div>
          <div className="text-xs text-gray-500">Avg Distance</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{data.avgDirectionChanges}</div>
          <div className="text-xs text-gray-500">Avg Direction Changes</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${data.erraticPercentage > 20 ? 'text-red-600' : 'text-gray-900'}`}>
            {data.erraticPercentage.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Erratic Sessions</div>
        </div>
      </div>

      {/* Pattern Distribution */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Movement Patterns</h4>
        <div className="grid grid-cols-2 gap-3">
          {patternData.map(({ pattern, count, percentage, icon, color, label }) => (
            <div
              key={pattern}
              className={`p-3 rounded-lg border ${
                color === 'green' ? 'bg-green-50 border-green-200' :
                color === 'blue' ? 'bg-blue-50 border-blue-200' :
                color === 'red' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={
                  color === 'green' ? 'text-green-600' :
                  color === 'blue' ? 'text-blue-600' :
                  color === 'red' ? 'text-red-600' :
                  'text-gray-600'
                }>
                  {icon}
                </span>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">{count}</span>
                <span className="text-xs text-gray-500">({percentage.toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session List */}
      {data.sessions.length > 0 && (
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Sessions by Movement Pattern</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.sessions.slice(0, 10).map((session) => (
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
  
  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <code className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
          {session.sessionId.slice(0, 10)}...
        </code>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses[config.color as keyof typeof colorClasses]}`}>
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{Math.round(session.totalDistance)}px</span>
        <span>{session.directionChanges} turns</span>
        <span className="font-medium">
          {(session.directnessScore * 100).toFixed(0)}% direct
        </span>
      </div>
    </div>
  );
}

export default CursorPathsPanel;
