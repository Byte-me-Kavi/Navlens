'use client';

/**
 * DebugPanel Component
 * Side panel showing console logs, network requests, and web vitals
 * Synced with session replay timeline
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDebugData } from '../hooks/useDebugData';
import { devtoolsApi } from '../services/devtoolsApi';
import { DebugPanelProps, ConsoleEvent, NetworkEvent, WebVitalEvent } from '../types/devtools.types';
import {
  FiX,
  FiTerminal,
  FiGlobe,
  FiActivity,
  FiSearch,
  FiFilter,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiChevronDown,
  FiChevronRight,
  FiRefreshCw,
} from 'react-icons/fi';

// Console level icons
const ConsoleLevelIcon: React.FC<{ level: string }> = ({ level }) => {
  switch (level) {
    case 'error':
      return <FiAlertCircle className="w-4 h-4 text-red-500" />;
    case 'warn':
      return <FiAlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'info':
      return <FiInfo className="w-4 h-4 text-blue-500" />;
    default:
      return <FiTerminal className="w-4 h-4 text-gray-500" />;
  }
};

// Format timestamp relative to session start
function formatRelativeTime(timestamp: string, sessionStartTime: number): string {
  const eventTime = new Date(timestamp).getTime();
  const relativeMs = eventTime - sessionStartTime;
  
  if (relativeMs < 0) return '00:00.000';
  
  const totalSeconds = Math.floor(relativeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = relativeMs % 1000;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// Console Tab Component
const ConsoleTab: React.FC<{
  events: ConsoleEvent[];
  sessionStartTime: number;
  onSeek?: (timeMs: number) => void;
}> = ({ events, sessionStartTime, onSeek }) => {
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string[]>(['log', 'warn', 'error', 'info', 'debug']);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!levelFilter.includes(e.console_level)) return false;
      if (filter && !e.console_message.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [events, filter, levelFilter]);

  const toggleLevel = (level: string) => {
    setLevelFilter((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleClick = (event: ConsoleEvent) => {
    if (onSeek) {
      const eventTime = new Date(event.timestamp).getTime();
      const relativeMs = eventTime - sessionStartTime;
      onSeek(relativeMs);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 space-y-2">
        <div className="relative">
          <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['log', 'warn', 'error', 'info', 'debug'].map((level) => {
            const colors = devtoolsApi.getConsoleLevelColor(level);
            const isActive = levelFilter.includes(level);
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.text}`
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Console Entries */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No console logs found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map((event, index) => {
              const colors = devtoolsApi.getConsoleLevelColor(event.console_level);
              const isExpanded = expandedRows.has(index);
              const hasStack = event.console_stack && event.console_stack.length > 0;
              
              return (
                <div
                  key={index}
                  className={`p-2 hover:bg-gray-50 cursor-pointer transition-colors ${colors.bg} ${colors.bg.replace('100', '50')}`}
                  onClick={() => handleClick(event)}
                >
                  <div className="flex items-start gap-2">
                    <ConsoleLevelIcon level={event.console_level} />
                    <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                      {formatRelativeTime(event.timestamp, sessionStartTime)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-mono break-words ${colors.text}`}>
                        {event.console_message.substring(0, 200)}
                        {event.console_message.length > 200 && '...'}
                      </p>
                    </div>
                    {hasStack && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(index);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <FiChevronDown className="w-4 h-4" />
                        ) : (
                          <FiChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  {isExpanded && hasStack && (
                    <pre className="mt-2 p-2 bg-gray-800 text-gray-200 text-xs font-mono rounded overflow-x-auto whitespace-pre-wrap">
                      {event.console_stack}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Network Tab Component
const NetworkTab: React.FC<{
  events: NetworkEvent[];
  sessionStartTime: number;
  onSeek?: (timeMs: number) => void;
}> = ({ events, sessionStartTime, onSeek }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter === 'success' && (e.network_status >= 400 || e.network_status === 0)) return false;
      if (statusFilter === 'error' && e.network_status > 0 && e.network_status < 400) return false;
      if (filter && !e.network_url.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [events, filter, statusFilter]);

  const handleClick = (event: NetworkEvent) => {
    if (onSeek) {
      const eventTime = new Date(event.timestamp).getTime();
      const relativeMs = eventTime - sessionStartTime;
      onSeek(relativeMs);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-2 border-b border-gray-200 bg-gray-50 space-y-2">
        <div className="relative">
          <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter URLs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'success', 'error'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2 py-0.5 text-xs rounded font-medium transition-all ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Network Entries */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No network requests found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-2 py-1.5 font-medium">Time</th>
                <th className="px-2 py-1.5 font-medium">Method</th>
                <th className="px-2 py-1.5 font-medium">URL</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map((event, index) => {
                const statusColors = devtoolsApi.getStatusColor(event.network_status);
                const isError = event.network_status >= 400 || event.network_status === 0;
                const isSlow = event.network_duration_ms > 2000;
                
                return (
                  <tr
                    key={index}
                    onClick={() => handleClick(event)}
                    className={`hover:bg-gray-50 cursor-pointer ${isError ? 'bg-red-50' : isSlow ? 'bg-yellow-50' : ''}`}
                  >
                    <td className="px-2 py-1.5 font-mono text-xs text-gray-400">
                      {formatRelativeTime(event.timestamp, sessionStartTime)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-medium text-gray-700">{event.network_method}</span>
                    </td>
                    <td className="px-2 py-1.5 max-w-xs truncate" title={event.network_url}>
                      <span className="text-gray-600">{event.network_url.replace(/^https?:\/\/[^/]+/, '')}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                        {event.network_status || 'Failed'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`text-xs ${isSlow ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                        {event.network_duration_ms}ms
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Performance Tab Component (Web Vitals)
const PerformanceTab: React.FC<{
  events: WebVitalEvent[];
}> = ({ events }) => {
  return (
    <div className="p-4">
      {events.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
          No Web Vitals recorded
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {events.map((event, index) => {
            const color = devtoolsApi.getVitalColor(event.vital_rating);
            return (
              <div
                key={index}
                className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{event.vital_name}</span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full font-medium"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {event.vital_rating}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color }}>
                  {devtoolsApi.formatVitalValue(event.vital_name, event.vital_value)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vitals Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">What do these mean?</h4>
        <dl className="space-y-2 text-xs text-gray-600">
          <div>
            <dt className="font-medium">LCP (Largest Contentful Paint)</dt>
            <dd>Time until the largest content element is visible. Target: &lt;2.5s</dd>
          </div>
          <div>
            <dt className="font-medium">CLS (Cumulative Layout Shift)</dt>
            <dd>How much the page layout shifts unexpectedly. Target: &lt;0.1</dd>
          </div>
          <div>
            <dt className="font-medium">INP (Interaction to Next Paint)</dt>
            <dd>Responsiveness to user interactions. Target: &lt;200ms</dd>
          </div>
          <div>
            <dt className="font-medium">FCP (First Contentful Paint)</dt>
            <dd>Time until first content is painted. Target: &lt;1.8s</dd>
          </div>
          <div>
            <dt className="font-medium">TTFB (Time to First Byte)</dt>
            <dd>Server response time. Target: &lt;800ms</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

// Main DebugPanel Component
export default function DebugPanel({
  sessionId,
  siteId,
  currentTime: _currentTime,
  sessionStartTime,
  onSeek,
  isOpen,
  onClose,
}: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'network' | 'performance'>('console');

  const { data, isLoading, error, hasErrors, hasNetworkIssues, hasPoorVitals, refresh } = useDebugData({
    sessionId,
    siteId,
    sessionStartTime,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FiTerminal className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-gray-900">Dev Tools</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close"
          >
            <FiX className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('console')}
          className={`flex-1 px-2 py-2 text-xs font-semibold transition-all relative ${
            activeTab === 'console'
              ? 'text-blue-700 bg-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FiTerminal className="w-3.5 h-3.5" />
            Console
            {hasErrors && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </div>
          {activeTab === 'console' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex-1 px-2 py-2 text-xs font-semibold transition-all relative ${
            activeTab === 'network'
              ? 'text-blue-700 bg-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FiGlobe className="w-3.5 h-3.5" />
            Network
            {hasNetworkIssues && (
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </div>
          {activeTab === 'network' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 px-2 py-2 text-xs font-semibold transition-all relative ${
            activeTab === 'performance'
              ? 'text-blue-700 bg-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <FiActivity className="w-3.5 h-3.5" />
            Vitals
            {hasPoorVitals && (
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
            )}
          </div>
          {activeTab === 'performance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <FiAlertCircle className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-xs text-gray-600">Failed to load debug data</p>
            <button
              onClick={refresh}
              className="mt-2 text-xs text-blue-600 hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'console' && (
              <ConsoleTab
                events={data?.console || []}
                sessionStartTime={sessionStartTime}
                onSeek={onSeek}
              />
            )}
            {activeTab === 'network' && (
              <NetworkTab
                events={data?.network || []}
                sessionStartTime={sessionStartTime}
                onSeek={onSeek}
              />
            )}
            {activeTab === 'performance' && (
              <PerformanceTab events={data?.webVitals || []} />
            )}
          </>
        )}
      </div>

      {/* Footer with counts */}
      {data && (
        <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-[10px] text-gray-500 flex gap-3">
          <span className="font-medium">{data.console.length} logs</span>
          <span className="font-medium">{data.network.length} requests</span>
          <span className="font-medium">{data.webVitals.length} vitals</span>
        </div>
      )}
    </div>
  );
}
