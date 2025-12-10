'use client';

import React, { useMemo } from 'react';
import { FiMap, FiClock, FiUsers, FiRefreshCw } from 'react-icons/fi';
import { HoverHeatmapData, AttentionZone } from '../types/frustrationSignals.types';

interface AttentionZonesChartProps {
  data: HoverHeatmapData | null;
  loading: boolean;
  error: Error | null;
  onRefresh?: () => void;
  className?: string;
}

const ZONE_COLORS: Record<string, { bg: string; fill: string; text: string }> = {
  heading: { bg: 'bg-blue-100', fill: 'bg-blue-500', text: 'text-blue-700' },
  content: { bg: 'bg-green-100', fill: 'bg-green-500', text: 'text-green-700' },
  interactive: { bg: 'bg-purple-100', fill: 'bg-purple-500', text: 'text-purple-700' },
  media: { bg: 'bg-orange-100', fill: 'bg-orange-500', text: 'text-orange-700' },
  navigation: { bg: 'bg-cyan-100', fill: 'bg-cyan-500', text: 'text-cyan-700' },
  form: { bg: 'bg-pink-100', fill: 'bg-pink-500', text: 'text-pink-700' },
  other: { bg: 'bg-gray-100', fill: 'bg-gray-500', text: 'text-gray-700' },
};

const ZONE_LABELS: Record<string, string> = {
  heading: '📝 Headings',
  content: '📄 Content',
  interactive: '🔘 Interactive',
  media: '🖼️ Media',
  navigation: '🧭 Navigation',
  form: '📋 Forms',
  other: '📦 Other',
};

export function AttentionZonesChart({
  data,
  loading,
  error,
  onRefresh,
  className = '',
}: AttentionZonesChartProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const sortedZones = useMemo(() => {
    if (!data?.attentionZones) return [];
    return [...data.attentionZones].sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  }, [data?.attentionZones]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading attention zones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-red-100 ${className}`}>
        <div className="text-center py-8 text-red-600">
          <span>Failed to load attention data</span>
        </div>
      </div>
    );
  }

  if (!data || sortedZones.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${className}`}>
        <div className="text-center py-8">
          <FiMap className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Attention Data</h3>
          <p className="text-gray-500 text-sm">
            Hover tracking data will appear once users move their mouse on your page.
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
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg">
              <FiMap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Attention Zones</h3>
              <p className="text-sm text-gray-500">
                Total attention: {formatTime(data.totalHoverTimeMs)}
              </p>
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

      {/* Zones Chart */}
      <div className="p-6">
        <div className="space-y-4">
          {sortedZones.map((zone) => {
            const colors = ZONE_COLORS[zone.zone] || ZONE_COLORS.other;
            const label = ZONE_LABELS[zone.zone] || zone.zone;

            return (
              <div key={zone.zone} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      {formatTime(zone.totalTimeMs)}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiUsers className="w-3 h-3" />
                      {zone.uniqueSessions}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {zone.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={`w-full ${colors.bg} rounded-full h-3 overflow-hidden`}>
                  <div
                    className={`h-full ${colors.fill} rounded-full transition-all group-hover:opacity-75`}
                    style={{ width: `${zone.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(ZONE_LABELS).slice(0, 6).map(([key, label]) => (
            <span
              key={key}
              className={`px-2 py-1 rounded ${ZONE_COLORS[key]?.bg || 'bg-gray-100'} ${ZONE_COLORS[key]?.text || 'text-gray-700'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AttentionZonesChart;
