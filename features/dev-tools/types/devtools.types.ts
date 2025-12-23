/**
 * Developer Tools Types
 * Types for console logs, network requests, and web vitals
 */

// Console log event
export interface ConsoleEvent {
    event_type: 'console';
    timestamp: string;
    console_level: 'log' | 'warn' | 'error' | 'info' | 'debug';
    console_message: string;
    console_stack: string;
    page_url: string;
}

// Network request event
export interface NetworkEvent {
    event_type: 'network';
    timestamp: string;
    network_method: string;
    network_url: string;
    network_status: number;
    network_duration_ms: number;
    network_type: 'fetch' | 'xhr';
    network_initiator: string;
    request_size: number;
    response_size: number;
    page_url: string;
}

// Web Vital event
export interface WebVitalEvent {
    event_type: 'web_vital';
    timestamp: string;
    vital_name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';
    vital_value: number;
    vital_rating: 'good' | 'needs-improvement' | 'poor';
    vital_entries: string;
    page_url: string;
}

// Combined debug event type
export type DebugEvent = ConsoleEvent | NetworkEvent | WebVitalEvent;

// API response for debug data
export interface DebugDataResponse {
    console: ConsoleEvent[];
    network: NetworkEvent[];
    webVitals: WebVitalEvent[];
    totalCount: number;
    sessionId: string;
}

// Debug panel state
export interface DebugPanelState {
    isOpen: boolean;
    activeTab: 'console' | 'network' | 'performance' | 'signals';
    consoleFilter: string;
    consoleLevelFilter: string[];
    networkFilter: string;
    networkStatusFilter: 'all' | 'success' | 'error';
}

// Timeline marker for overlay
export interface TimelineMarker {
    timestamp: number; // Relative to session start (ms)
    type: 'error' | 'warning' | 'network-error' | 'slow-request' | 'vital-poor' | 'rage-click' | 'dead-click';
    label: string;
    details: string;
}

// Session signal event (rage clicks, dead clicks, etc.)
export interface SessionSignal {
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

// Props for debug components
export interface DebugPanelProps {
    sessionId: string;
    siteId: string;
    currentTime: number; // Current playback position in ms
    sessionStartTime: number; // Session start timestamp
    onSeek?: (timeMs: number) => void;
    isOpen: boolean;
    onClose: () => void;
    signals?: SessionSignal[]; // Added signals prop
}

export interface ConsoleTabProps {
    events: ConsoleEvent[];
    currentTime: number;
    sessionStartTime: number;
    onSeek?: (timeMs: number) => void;
    filter: string;
    levelFilter: string[];
    onFilterChange: (filter: string) => void;
    onLevelFilterChange: (levels: string[]) => void;
}

export interface NetworkTabProps {
    events: NetworkEvent[];
    currentTime: number;
    sessionStartTime: number;
    onSeek?: (timeMs: number) => void;
    filter: string;
    statusFilter: 'all' | 'success' | 'error';
    onFilterChange: (filter: string) => void;
    onStatusFilterChange: (status: 'all' | 'success' | 'error') => void;
}

export interface WebVitalsOverlayProps {
    events: WebVitalEvent[];
    sessionDuration: number; // Total duration in ms
}
