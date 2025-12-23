'use client';

/**
 * DebugPanel Component
 * Side panel showing console logs, network requests, and web vitals
 * Synced with session replay timeline
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDebugData } from '../hooks/useDebugData';
import { devtoolsApi } from '../services/devtoolsApi';
import { DebugPanelProps, ConsoleEvent, NetworkEvent, WebVitalEvent, SessionSignal } from '../types/devtools.types';
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
  FiZap,
} from 'react-icons/fi';

// Console level icons
const ConsoleLevelIcon: React.FC<{ level: string }> = ({ level }) => {
  switch (level) {
    case 'error':
      return <FiAlertCircle className="w-4 h-4 text-rose-500" />;
    case 'warn':
      return <FiAlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'info':
      return <FiInfo className="w-4 h-4 text-indigo-500" />;
    default:
      return <FiTerminal className="w-4 h-4 text-gray-400" />;
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
  highlightedTimestamp?: number;
}> = ({ events, sessionStartTime, onSeek, highlightedTimestamp }) => {
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

  // Scroll to highlighted event
  useEffect(() => {
    if (highlightedTimestamp && listRef.current) {
        
        const targetId = `console-event-${highlightedTimestamp}`;
        const element = document.getElementById(targetId);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Console Error Highlight (Red)
            const highlightClasses = ['bg-rose-50', 'ring-4', 'ring-rose-200', 'z-20', 'scale-[1.02]', 'shadow-xl', 'transition-all', 'duration-500', 'relative'];
            element.classList.add(...highlightClasses);
            
            setTimeout(() => {
                element.classList.remove(...highlightClasses);
            }, 3000); // Increased to 3s
        }
    }
  }, [highlightedTimestamp]);

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
    <div className="flex flex-col h-full bg-white">
      {/* Filters */}
      <div className="p-3 border-b border-indigo-50/60 bg-white space-y-3">
        <div className="relative group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['log', 'warn', 'error', 'info', 'debug'].map((level) => {
            const isActive = levelFilter.includes(level);
            let activeClass = "";
            const inactiveClass = "bg-white border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600";
            
            switch(level) {
                case 'error': activeClass = "bg-rose-50 text-rose-600 border border-rose-200"; break;
                case 'warn': activeClass = "bg-amber-50 text-amber-600 border border-amber-200"; break;
                case 'info': activeClass = "bg-indigo-50 text-indigo-600 border border-indigo-200"; break;
                default: activeClass = "bg-gray-100 text-gray-700 border border-gray-200"; break;
            }

            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all border ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Console Entries */}
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
            <FiTerminal className="w-8 h-8 opacity-20" />
            <span className="text-xs">No console logs found</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredEvents.map((event, index) => {
              const isExpanded = expandedRows.has(index);
              const hasStack = event.console_stack && event.console_stack.length > 0;
              
              // Key for ID - use relative time
              const relativeMs = new Date(event.timestamp).getTime() - sessionStartTime;
              
              let rowClass = "hover:bg-gray-50 transition-colors";
              if (event.console_level === 'error') rowClass = "bg-rose-50/30 hover:bg-rose-50/50";
              if (event.console_level === 'warn') rowClass = "bg-amber-50/30 hover:bg-amber-50/50";

              return (
                <div
                  key={index}
                  id={`console-event-${relativeMs}`}
                  className={`p-3 cursor-pointer group transition-all duration-300 relative ${rowClass}`}
                  onClick={() => handleClick(event)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                        <ConsoleLevelIcon level={event.console_level} />
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap mt-0.5 select-none">
                      {formatRelativeTime(event.timestamp, sessionStartTime)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-mono break-words leading-relaxed text-gray-700 ${event.console_level === 'error' ? 'text-rose-700' : ''} ${event.console_level === 'warn' ? 'text-amber-700' : ''}`}>
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
                        className="p-1 hover:bg-gray-200/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isExpanded ? (
                          <FiChevronDown className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                          <FiChevronRight className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </button>
                    )}
                  </div>
                  {isExpanded && hasStack && (
                    <div className="mt-2 pl-7">
                        <pre className="p-3 bg-gray-900 text-gray-300 text-[10px] font-mono rounded-lg overflow-x-auto whitespace-pre-wrap border border-gray-800 shadow-inner">
                        {event.console_stack}
                        </pre>
                    </div>
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
  highlightedTimestamp?: number;
}> = ({ events, sessionStartTime, onSeek, highlightedTimestamp }) => {
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

  // Scroll to highlighted event
  useEffect(() => {
      if (highlightedTimestamp) {
          const targetId = `network-event-${highlightedTimestamp}`;
          const element = document.getElementById(targetId);
          
          if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Network Error Highlight (Amber)
              const highlightClasses = ['bg-amber-50', 'ring-4', 'ring-amber-200', 'z-20', 'scale-[1.02]', 'shadow-xl', 'transition-all', 'duration-500'];
              element.classList.add(...highlightClasses);
              
              setTimeout(() => {
                  element.classList.remove(...highlightClasses);
              }, 3000);
          }
      }
  }, [highlightedTimestamp]);

  const handleClick = (event: NetworkEvent) => {
    if (onSeek) {
      const eventTime = new Date(event.timestamp).getTime();
      const relativeMs = eventTime - sessionStartTime;
      onSeek(relativeMs);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Filters */}
      <div className="p-3 border-b border-indigo-50/60 bg-white space-y-3">
        <div className="relative group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Filter URLs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-lg border border-gray-200/50 w-fit">
          {(['all', 'success', 'error'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all ${
                statusFilter === status
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Network Entries */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
            <FiGlobe className="w-8 h-8 opacity-20" />
            <span className="text-xs">No network requests found</span>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-gray-100">
              <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-3 py-2 w-20">Time</th>
                <th className="px-3 py-2 w-16">Method</th>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2 w-20">Status</th>
                <th className="px-3 py-2 w-20 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEvents.map((event, index) => {
                const isError = event.network_status >= 400 || event.network_status === 0;
                const isSlow = event.network_duration_ms > 2000;
                const relativeMs = new Date(event.timestamp).getTime() - sessionStartTime;
                
                let statusClass = "bg-gray-100 text-gray-600";
                if (event.network_status >= 200 && event.network_status < 300) statusClass = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                if (event.network_status >= 300 && event.network_status < 400) statusClass = "bg-blue-50 text-blue-600 border border-blue-100";
                if (event.network_status >= 400 && event.network_status < 500) statusClass = "bg-amber-50 text-amber-600 border border-amber-100";
                if (event.network_status >= 500 || event.network_status === 0) statusClass = "bg-rose-50 text-rose-600 border border-rose-100";

                return (
                  <tr
                    key={index}
                    id={`network-event-${relativeMs}`}
                    onClick={() => handleClick(event)}
                    className={`hover:bg-gray-50 cursor-pointer transition-all duration-300 relative group ${isError ? 'bg-rose-50/10' : ''}`}
                  >
                    <td className="px-3 py-2.5 font-mono text-gray-400 text-[10px]">
                      {formatRelativeTime(event.timestamp, sessionStartTime)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-gray-600 text-[10px]">{event.network_method}</span>
                    </td>
                    <td className="px-3 py-2.5 max-w-xs truncate" title={event.network_url}>
                      <span className="text-gray-600 group-hover:text-indigo-600 transition-colors">{event.network_url.replace(/^https?:\/\/[^/]+/, '')}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusClass}`}>
                        {event.network_status || 'ERR'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-[10px] ${isSlow ? 'text-amber-600 font-bold' : 'text-gray-400'}`}>
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
    <div className="p-4 bg-white h-full overflow-y-auto scrollbar-thin">
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
            <FiActivity className="w-8 h-8 opacity-20" />
            <span className="text-xs">No Web Vitals recorded</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {events.map((event, index) => {
            const color = devtoolsApi.getVitalColor(event.vital_rating);
            return (
              <div
                key={index}
                className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{event.vital_name}</span>
                  <span
                    className="px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider border"
                    style={{ backgroundColor: `${color}10`, color, borderColor: `${color}30` }}
                  >
                    {event.vital_rating}
                  </span>
                </div>
                <div className="text-3xl font-bold tracking-tight" style={{ color }}>
                  {devtoolsApi.formatVitalValue(event.vital_name, event.vital_value)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vitals Legend */}
      <div className="mt-6 p-4 bg-gray-50/50 rounded-xl border border-gray-100/50">
        <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FiInfo className="w-3.5 h-3.5 text-indigo-500" />
            Metric Guide
        </h4>
        <dl className="space-y-3">
          {[
            { label: 'LCP (Largest Contentful Paint)', desc: 'Loading performance. Target < 2.5s' },
            { label: 'CLS (Cumulative Layout Shift)', desc: 'Visual stability. Target < 0.1' },
            { label: 'INP (Interaction to Next Paint)', desc: 'Interactivity. Target < 200ms' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-0.5">
                <dt className="text-[10px] font-bold text-gray-700">{item.label}</dt>
                <dd className="text-[10px] text-gray-500">{item.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

// Helper to get last part of selector for cleaner display
const getCleanSelector = (selector: string) => {
    if (!selector) return 'Unknown Element';
    const parts = selector.split('>');
    const lastPart = parts[parts.length - 1].trim();
    // Remove complex nth-child if it's too long, or keep it if simple
    return lastPart.length > 30 ? lastPart.substring(0, 30) + '...' : lastPart;
};

// Signals Tab Component
const SignalsTab: React.FC<{
  signals: SessionSignal[];
  sessionStartTime: number;
  onSeek?: (timeMs: number) => void;
  highlightedTimestamp?: number;
}> = ({ signals, sessionStartTime, onSeek, highlightedTimestamp }) => {
  const [filter, setFilter] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'rage_click' | 'dead_click'>('all');

  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (activeType !== 'all' && s.type !== activeType) return false;
      if (filter && !s.type.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [signals, filter, activeType]);

  const handleClick = (signal: SessionSignal) => {
    if (onSeek) {
      const eventTime = new Date(signal.timestamp).getTime();
      const relativeMs = eventTime - sessionStartTime;
      onSeek(relativeMs);
    }
  };

  // Scroll to highlighted event
  useEffect(() => {
    if (highlightedTimestamp) {
        // Construct ID properly
        const targetId = `signal-event-${highlightedTimestamp}`;
        const element = document.getElementById(targetId);
        
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Signal Highlight (Red/Orange)
            const highlightClasses = ['bg-orange-50', 'ring-4', 'ring-orange-200', 'z-20', 'scale-[1.02]', 'shadow-xl', 'transition-all', 'duration-500'];
            element.classList.add(...highlightClasses);
            
            setTimeout(() => {
                element.classList.remove(...highlightClasses);
            }, 3000);
        }
    }
}, [highlightedTimestamp]);

  return (
    <div className="flex flex-col h-full bg-white">
       {/* Filters */}
       <div className="p-3 border-b border-indigo-50/60 bg-white space-y-3">
        <div className="relative group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Filter signals..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        
        {/* Type Filters */}
        <div className="flex gap-1.5 flex-wrap">
            <button
                onClick={() => setActiveType('all')}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all border ${
                    activeType === 'all' 
                    ? 'bg-gray-100 text-gray-800 border-gray-200' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
                }`}
            >
                All
            </button>
            <button
                onClick={() => setActiveType('rage_click')}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all border ${
                    activeType === 'rage_click' 
                    ? 'bg-red-50 text-red-600 border-red-200' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-red-100 hover:text-red-500'
                }`}
            >
                Rage Clicks
            </button>
            <button
                onClick={() => setActiveType('dead_click')}
                className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all border ${
                    activeType === 'dead_click' 
                    ? 'bg-orange-50 text-orange-600 border-orange-200' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-orange-100 hover:text-orange-500'
                }`}
            >
                Dead Clicks
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
            <FiZap className="w-8 h-8 opacity-20" />
            <span className="text-xs">No signals found</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredSignals.map((signal, index) => {
              const relativeMs = new Date(signal.timestamp).getTime() - sessionStartTime;
              const isRageClick = signal.type === 'rage_click';
              const isDeadClick = signal.type === 'dead_click';
              const data = signal.data as any; // Cast for user friendly access
              
              let icon = <FiZap className="w-4 h-4 text-gray-400" />;
              let title = 'Signal';
              let colorClass = 'text-gray-700';
              let badgeClass = 'bg-gray-100 text-gray-600';

              if (isRageClick) {
                  icon = <FiZap className="w-4 h-4 text-red-500" />;
                  title = 'Rage Click';
                  colorClass = 'text-red-900';
                  badgeClass = 'bg-red-50 text-red-700 border border-red-100';
              } else if (isDeadClick) {
                  icon = <FiAlertCircle className="w-4 h-4 text-orange-500" />;
                  title = 'Dead Click';
                  colorClass = 'text-orange-900';
                  badgeClass = 'bg-orange-50 text-orange-700 border border-orange-100';
              }

              const elementSelector = data?.element_selector ? getCleanSelector(data.element_selector) : null;
              const elementTag = data?.element_tag ? `<${data.element_tag.toUpperCase()}>` : 'Unknown';
              const xPos = data?.x ? Math.round(data.x) : '?';
              const yPos = data?.y ? Math.round(data.y) : '?';

              return (
                <div
                  key={index}
                  id={`signal-event-${relativeMs}`}
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-all duration-300 group"
                  onClick={() => handleClick(signal)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                        {icon}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap mt-0.5 select-none">
                      {formatRelativeTime(signal.timestamp, sessionStartTime)}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${colorClass}`}>
                            {title}
                          </span>
                      </div>
                      
                      {/* Element Details */}
                      <div className="p-2 bg-gray-50/50 rounded-lg border border-gray-100 space-y-1.5">
                           {/* Selector */}
                           {elementSelector && (
                               <div className="flex flex-col">
                                   <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Element</span>
                                   <code className="text-[10px] text-indigo-700 font-mono break-all py-0.5" title={data?.element_selector}>
                                       {elementSelector}
                                   </code>
                               </div>
                           )}

                           {/* Position Details */}
                           <div className="flex items-center gap-3 pt-0.5 border-t border-gray-100/50">
                                <span className="text-[10px] text-gray-500">
                                   Tag: <span className="font-mono text-gray-700 font-medium">{elementTag}</span>
                                </span>
                                <span className="text-[10px] text-gray-500">
                                   Pos: <span className="font-mono text-gray-700 font-medium">x:{xPos} y:{yPos}</span>
                                </span>
                           </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  highlightedEvent, // New prop
  signals = [], // Default to empty array
}: DebugPanelProps & { highlightedEvent?: { timestamp: number, type: string } | null }) {
  const [activeTab, setActiveTab] = useState<'console' | 'network' | 'performance' | 'signals'>('console');

  // Auto-switch tab based on highlighted event
  useEffect(() => {
    if (highlightedEvent) {
      if (highlightedEvent.type === 'error') setActiveTab('console');
      if (highlightedEvent.type === 'network-error') setActiveTab('network');
      if (highlightedEvent.type === 'rage-click' || highlightedEvent.type === 'dead-click') setActiveTab('signals');
    }
  }, [highlightedEvent]);

  const { data, isLoading, error, hasErrors, hasNetworkIssues, hasPoorVitals, refresh } = useDebugData({
    sessionId,
    siteId,
    sessionStartTime,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full bg-white border-l border-indigo-100 flex flex-col shadow-2xl shadow-indigo-200/20 relative z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-50 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
             <FiTerminal className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Dev Tools</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            className="p-1.5 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white px-2 pt-2">
        {(['console', 'network', 'performance', 'signals'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let icon = <FiTerminal className="w-3.5 h-3.5" />;
            if(tab === 'network') icon = <FiGlobe className="w-3.5 h-3.5" />;
            if(tab === 'performance') icon = <FiActivity className="w-3.5 h-3.5" />;
            if(tab === 'signals') icon = <FiZap className="w-3.5 h-3.5" />;
            
            let indicator = null;
            if(tab === 'console' && hasErrors) indicator = <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />;
            if(tab === 'network' && hasNetworkIssues) indicator = <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />;
            if(tab === 'performance' && hasPoorVitals) indicator = <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />;
            if(tab === 'signals' && signals.length > 0) indicator = <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />;

            return (
                <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-2.5 pt-1.5 text-xs font-semibold transition-all relative flex items-center justify-center gap-2 ${
                    isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                >
                {icon}
                <span className="capitalize">{tab === 'performance' ? 'Vitals' : tab}</span>
                {indicator}
                {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full mx-4" />
                )}
                </button>
            )
        })}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent shadow-lg shadow-indigo-200" />
            <span className="text-xs font-medium text-indigo-600 animate-pulse">Loading debug data...</span>
          </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            {/* Error view */}
            <div className="p-3 bg-rose-50 rounded-full text-rose-500">
                <FiAlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-900">Failed to load debug data</p>
            <p className="text-xs text-gray-500">Something went wrong while fetching the data.</p>
            <button
              onClick={refresh}
              className="px-4 py-2 text-xs bg-white border border-gray-200 hover:border-indigo-200 hover:text-indigo-600 rounded-lg transition-all shadow-sm font-medium"
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
                highlightedTimestamp={highlightedEvent?.type === 'error' ? highlightedEvent.timestamp : undefined}
              />
            )}
            {activeTab === 'network' && (
              <NetworkTab
                events={data?.network || []}
                sessionStartTime={sessionStartTime}
                onSeek={onSeek}
                highlightedTimestamp={highlightedEvent?.type === 'network-error' ? highlightedEvent.timestamp : undefined}
              />
            )}
            {activeTab === 'performance' && (
              <PerformanceTab events={data?.webVitals || []} />
            )}
            {activeTab === 'signals' && (
              <SignalsTab 
                signals={signals} 
                sessionStartTime={sessionStartTime}
                onSeek={onSeek}
                highlightedTimestamp={(highlightedEvent?.type === 'rage-click' || highlightedEvent?.type === 'dead-click') ? highlightedEvent.timestamp : undefined}
              />
            )}
          </>
        )}
      </div>

      {/* Footer with counts */}
      {data && (
        <div className="px-4 py-2 border-t border-indigo-50 bg-gray-50/50 backdrop-blur-sm text-[10px] text-gray-500 flex justify-between items-center">
            <div className="flex gap-4">
                <span className="font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                    {data.console.length} logs
                </span>
                <span className="font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    {data.network.length} requests
                </span>
                 <span className="font-medium flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                    {signals.length} signals
                </span>
            </div>
            <span className="font-mono opacity-50">v1.1.0</span>
        </div>
      )}
    </div>
  );
}
