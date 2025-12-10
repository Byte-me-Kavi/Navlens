/**
 * Developer Tools API Service
 * Fetches debug data for session replay
 */

import { apiClient } from '@/shared/services/api/client';
import { DebugDataResponse, TimelineMarker } from '../types/devtools.types';

/**
 * Fetch debug data for a session
 */
export async function getDebugData(
    sessionId: string,
    siteId: string,
    options?: {
        type?: 'console' | 'network' | 'web_vital';
        limit?: number;
        offset?: number;
    }
): Promise<DebugDataResponse> {
    const params = new URLSearchParams({ siteId });

    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    return apiClient.get<DebugDataResponse>(
        `/sessions/${sessionId}/debug-data?${params.toString()}`
    );
}

/**
 * Convert debug events to timeline markers for visual overlay
 */
export function createTimelineMarkers(
    data: DebugDataResponse,
    sessionStartTime: number
): TimelineMarker[] {
    const markers: TimelineMarker[] = [];

    // Console errors
    for (const event of data.console) {
        if (event.console_level === 'error') {
            const timestamp = new Date(event.timestamp).getTime() - sessionStartTime;
            markers.push({
                timestamp,
                type: 'error',
                label: 'JS Error',
                details: event.console_message.substring(0, 100),
            });
        }
    }

    // Console warnings (only major ones)
    for (const event of data.console) {
        if (event.console_level === 'warn') {
            const timestamp = new Date(event.timestamp).getTime() - sessionStartTime;
            markers.push({
                timestamp,
                type: 'warning',
                label: 'Warning',
                details: event.console_message.substring(0, 100),
            });
        }
    }

    // Network errors (status >= 400 or status === 0)
    for (const event of data.network) {
        if (event.network_status >= 400 || event.network_status === 0) {
            const timestamp = new Date(event.timestamp).getTime() - sessionStartTime;
            markers.push({
                timestamp,
                type: 'network-error',
                label: `${event.network_method} ${event.network_status || 'Failed'}`,
                details: event.network_url.substring(0, 100),
            });
        }
    }

    // Slow requests (> 2 seconds)
    for (const event of data.network) {
        if (event.network_duration_ms > 2000) {
            const timestamp = new Date(event.timestamp).getTime() - sessionStartTime;
            markers.push({
                timestamp,
                type: 'slow-request',
                label: `Slow: ${Math.round(event.network_duration_ms / 1000)}s`,
                details: event.network_url.substring(0, 100),
            });
        }
    }

    // Poor web vitals
    for (const event of data.webVitals) {
        if (event.vital_rating === 'poor') {
            const timestamp = new Date(event.timestamp).getTime() - sessionStartTime;
            markers.push({
                timestamp,
                type: 'vital-poor',
                label: `${event.vital_name}: ${formatVitalValue(event.vital_name, event.vital_value)}`,
                details: `Rating: ${event.vital_rating}`,
            });
        }
    }

    // Sort by timestamp
    markers.sort((a, b) => a.timestamp - b.timestamp);

    return markers;
}

/**
 * Format vital value for display
 */
export function formatVitalValue(name: string, value: number): string {
    switch (name) {
        case 'CLS':
            return value.toFixed(3);
        case 'LCP':
        case 'FCP':
        case 'INP':
        case 'TTFB':
            return `${Math.round(value)}ms`;
        default:
            return String(value);
    }
}

/**
 * Get color for vital rating
 */
export function getVitalColor(rating: string): string {
    switch (rating) {
        case 'good':
            return '#22c55e'; // green-500
        case 'needs-improvement':
            return '#f59e0b'; // amber-500
        case 'poor':
            return '#ef4444'; // red-500
        default:
            return '#6b7280'; // gray-500
    }
}

/**
 * Get color for console level
 */
export function getConsoleLevelColor(level: string): { bg: string; text: string } {
    switch (level) {
        case 'error':
            return { bg: 'bg-red-100', text: 'text-red-700' };
        case 'warn':
            return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
        case 'info':
            return { bg: 'bg-blue-100', text: 'text-blue-700' };
        case 'debug':
            return { bg: 'bg-gray-100', text: 'text-gray-600' };
        default:
            return { bg: 'bg-gray-50', text: 'text-gray-800' };
    }
}

/**
 * Get color for HTTP status
 */
export function getStatusColor(status: number): { bg: string; text: string } {
    if (status === 0) return { bg: 'bg-red-100', text: 'text-red-700' };
    if (status >= 500) return { bg: 'bg-red-100', text: 'text-red-700' };
    if (status >= 400) return { bg: 'bg-orange-100', text: 'text-orange-700' };
    if (status >= 300) return { bg: 'bg-blue-100', text: 'text-blue-700' };
    if (status >= 200) return { bg: 'bg-green-100', text: 'text-green-700' };
    return { bg: 'bg-gray-100', text: 'text-gray-700' };
}

// Export all functions
export const devtoolsApi = {
    getDebugData,
    createTimelineMarkers,
    formatVitalValue,
    getVitalColor,
    getConsoleLevelColor,
    getStatusColor,
};
