/**
 * useCursorPathsData Hook
 * 
 * Custom hook for fetching cursor movement path data with SWR caching
 */

import useSWR from 'swr';
import { useMemo } from 'react';
import { apiClient } from '@/shared/services/api/client';

export interface SessionPath {
    sessionId: string;
    totalDistance: number;
    directionChanges: number;
    erraticSegments: number;
    pathSegments: number;
    pattern: 'focused' | 'exploring' | 'lost' | 'minimal';
    directnessScore: number;
    duration: number;
}

export interface CursorPathsData {
    totalSessions: number;
    avgDistance: number;
    avgDirectionChanges: number;
    erraticSessions: number;
    erraticPercentage: number;
    patternBreakdown: {
        focused: number;
        exploring: number;
        lost: number;
        minimal: number;
    };
    sessions: SessionPath[];
    note?: string;
    error?: string;
}

interface CursorPathsParams {
    siteId: string;
    pagePath: string;
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

interface UseCursorPathsDataResult {
    data: CursorPathsData | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

// SWR fetcher for cursor paths
const cursorPathsFetcher = async ([, params]: [string, CursorPathsParams]): Promise<CursorPathsData> => {
    console.log('🖱️ Fetching cursor paths data:', params);

    const result = await apiClient.post<CursorPathsData>('/cursor-paths', params);

    console.log('✓ Cursor paths data fetched:', {
        totalSessions: result.totalSessions,
        patternBreakdown: result.patternBreakdown,
    });

    return result;
};

export function useCursorPathsData(params: CursorPathsParams): UseCursorPathsDataResult {
    // Create stable cache key
    const cacheKey = useMemo(() => {
        if (!params.siteId || !params.pagePath) return null;
        return [
            '/api/cursor-paths',
            {
                siteId: params.siteId,
                pagePath: params.pagePath,
                limit: params.limit || 50,
            }
        ] as [string, CursorPathsParams];
    }, [params.siteId, params.pagePath, params.limit]);

    const { data, error, isLoading, mutate } = useSWR(
        cacheKey,
        cursorPathsFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
            keepPreviousData: true,
            errorRetryCount: 2,
            errorRetryInterval: 3000,
            revalidateIfStale: false,
        }
    );

    return {
        data: data || null,
        loading: isLoading,
        error: error || null,
        refetch: async () => { await mutate(); },
    };
}
