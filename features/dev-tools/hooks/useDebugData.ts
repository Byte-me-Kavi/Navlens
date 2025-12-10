/**
 * useDebugData Hook
 * Fetches and manages debug data for session replay with SWR caching
 */

'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { devtoolsApi } from '../services/devtoolsApi';
import { DebugDataResponse, TimelineMarker } from '../types/devtools.types';

interface UseDebugDataOptions {
    sessionId: string;
    siteId: string;
    sessionStartTime?: number;
    enabled?: boolean;
}

interface UseDebugDataReturn {
    data: DebugDataResponse | undefined;
    isLoading: boolean;
    error: Error | undefined;
    markers: TimelineMarker[];
    hasErrors: boolean;
    hasNetworkIssues: boolean;
    hasPoorVitals: boolean;
    refresh: () => void;
}

/**
 * Hook for fetching debug data with SWR
 */
export function useDebugData({
    sessionId,
    siteId,
    sessionStartTime = 0,
    enabled = true,
}: UseDebugDataOptions): UseDebugDataReturn {
    const { data, error, isLoading, mutate } = useSWR<DebugDataResponse>(
        enabled && sessionId && siteId
            ? ['debug-data', sessionId, siteId]
            : null,
        () => devtoolsApi.getDebugData(sessionId, siteId),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000, // Cache for 1 minute
        }
    );

    // Create timeline markers
    const markers = useMemo(() => {
        if (!data || !sessionStartTime) return [];
        return devtoolsApi.createTimelineMarkers(data, sessionStartTime);
    }, [data, sessionStartTime]);

    // Summary flags
    const hasErrors = useMemo(() => {
        if (!data) return false;
        return data.console.some((e) => e.console_level === 'error');
    }, [data]);

    const hasNetworkIssues = useMemo(() => {
        if (!data) return false;
        return data.network.some(
            (e) => e.network_status >= 400 || e.network_status === 0
        );
    }, [data]);

    const hasPoorVitals = useMemo(() => {
        if (!data) return false;
        return data.webVitals.some((e) => e.vital_rating === 'poor');
    }, [data]);

    return {
        data,
        isLoading,
        error: error as Error | undefined,
        markers,
        hasErrors,
        hasNetworkIssues,
        hasPoorVitals,
        refresh: () => mutate(),
    };
}

export default useDebugData;
