'use client';

import React, { useMemo } from 'react';
import { 
  FiMap, 
  FiClock, 
  FiUsers, 
  FiRefreshCw, 
  FiFileText, 
  FiFile, 
  FiMousePointer,
  FiImage,
  FiNavigation,
  FiEdit,
  FiPackage,
  FiInfo,
} from 'react-icons/fi';
import { HoverHeatmapData } from '../types/frustrationSignals.types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface AttentionZonesChartProps {
  data: HoverHeatmapData | null;
  loading: boolean;
  error: Error | null;
  onRefresh?: () => void;
  className?: string;
}

// Zone configuration with icons, colors, and descriptions
const ZONE_CONFIG: Record<string, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
  bgColor: string;
  textColor: string;
  description: string;
}> = {
  heading: { 
    icon: <FiFileText className="w-4 h-4" />, 
    color: '#3b82f6', 
    label: 'Headings',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    description: 'Time spent hovering over page titles, h1-h6 tags, and section headers'
  },
  content: { 
    icon: <FiFile className="w-4 h-4" />, 
    color: '#22c55e', 
    label: 'Content',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    description: 'Time reading main body text, paragraphs, and article content'
  },
  interactive: { 
    icon: <FiMousePointer className="w-4 h-4" />, 
    color: '#8b5cf6', 
    label: 'Interactive',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    description: 'Time on buttons, links, dropdowns, and clickable elements'
  },
  media: { 
    icon: <FiImage className="w-4 h-4" />, 
    color: '#f97316', 
    label: 'Media',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    description: 'Time viewing images, videos, and other media content'
  },
  navigation: { 
    icon: <FiNavigation className="w-4 h-4" />, 
    color: '#06b6d4', 
    label: 'Navigation',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    description: 'Time on menus, navbars, sidebars, and navigation elements'
  },
  form: { 
    icon: <FiEdit className="w-4 h-4" />, 
    color: '#ec4899', 
    label: 'Forms',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    description: 'Time interacting with form fields, inputs, and checkboxes'
  },
  other: { 
    icon: <FiPackage className="w-4 h-4" />, 
    color: '#6b7280', 
    label: 'Other',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    description: 'Time on miscellaneous elements like footers, ads, and widgets'
  },
};

// Format time helper (moved outside component for CustomTooltip)
const formatTimeHelper = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// Custom tooltip - defined outside component to avoid creating during render
interface TooltipPayloadItem {
  payload: {
    name: string;
    value: number;
    totalTimeMs: number;
    uniqueSessions: number;
    color: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const zoneData = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 min-w-[160px]">
        <p className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: zoneData.color }}
          ></span>
          {zoneData.name}
        </p>
        <div className="space-y-1 text-sm text-gray-600">
          <p>Attention: <span className="font-semibold text-gray-900">{zoneData.value.toFixed(1)}%</span></p>
          <p>Time: <span className="font-semibold text-gray-900">{formatTimeHelper(zoneData.totalTimeMs)}</span></p>
          <p>Sessions: <span className="font-semibold text-gray-900">{zoneData.uniqueSessions}</span></p>
        </div>
      </div>
    );
  }
  return null;
}

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
    if (!data || !data.attentionZones) return [];
    return [...data.attentionZones].sort((a, b) => b.totalTimeMs - a.totalTimeMs);
  }, [data]);

  // Prepare pie chart data
  const chartData = useMemo(() => {
    return sortedZones.map(zone => ({
      name: ZONE_CONFIG[zone.zone]?.label || zone.zone,
      value: zone.percentage,
      totalTimeMs: zone.totalTimeMs,
      uniqueSessions: zone.uniqueSessions,
      color: ZONE_CONFIG[zone.zone]?.color || '#6b7280',
    }));
  }, [sortedZones]);

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-500">Loading attention zones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-red-100 ${className}`}>
        <div className="text-center py-8 text-red-600">
          <span>Failed to load attention data</span>
        </div>
      </div>
    );
  }

  if (!data || sortedZones.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm p-6 border border-gray-100 ${className}`}>
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
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-xl">
              <FiMap className="w-5 h-5 text-violet-600" />
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
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Chart and Details */}
      <div className="p-6">
        {/* Pie Chart */}
        <div className="h-[200px] mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Zone Details - Fixed spacing */}
        <div className="space-y-2 mb-6">
          {sortedZones.slice(0, 5).map((zone) => {
            const config = ZONE_CONFIG[zone.zone] || ZONE_CONFIG.other;
            return (
              <div 
                key={zone.zone}
                className={`flex items-center justify-between p-3 rounded-xl ${config.bgColor}`}
              >
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className={config.textColor}>{config.icon}</span>
                  <span className={`text-sm font-medium ${config.textColor}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-gray-500 min-w-[50px]">
                    <FiClock className="w-3 h-3 flex-shrink-0" />
                    {formatTime(zone.totalTimeMs)}
                  </span>
                  <span className="flex items-center gap-1 text-gray-500 min-w-[35px]">
                    <FiUsers className="w-3 h-3 flex-shrink-0" />
                    {zone.uniqueSessions}
                  </span>
                  <span className="font-bold text-gray-700 min-w-[45px] text-right">
                    {zone.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone Explanations */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <FiInfo className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">What do these zones mean?</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {sortedZones.slice(0, 4).map((zone) => {
              const config = ZONE_CONFIG[zone.zone] || ZONE_CONFIG.other;
              return (
                <div key={zone.zone} className="flex items-start gap-2">
                  <span 
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: config.color }}
                  ></span>
                  <div>
                    <span className="text-xs font-medium text-gray-700">{config.label}: </span>
                    <span className="text-xs text-gray-500">{config.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttentionZonesChart;
