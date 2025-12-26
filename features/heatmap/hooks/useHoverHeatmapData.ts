// features/heatmap/hooks/useHoverHeatmapData.ts
import useSWR from 'swr';
import { useMemo } from 'react';
import { apiClient } from '@/shared/services/api/client';

export interface HoverHeatmapPoint {
    selector: string;
    tag: string;
    zone: string;
    duration: number;
    count: number;
    avgDuration: number;
    x: number;
    y: number;
    intensity: number;
}

export interface HoverHeatmapData {
    totalHoverTimeMs: number;
    heatmapPoints: HoverHeatmapPoint[];
    attentionZones: Array<{
        zone: string;
        totalTimeMs: number;
        eventCount: number;
        uniqueSessions: number;
        percentage: number;
    }>;
    note?: string;
    error?: string;
}

export interface HoverHeatmapParams {
    siteId: string;
    pagePath: string;
    deviceType: string;
    startDate?: string;
    endDate?: string;
    days?: number;
    shareToken?: string;
}

interface UseHoverHeatmapDataResult {
    data: HoverHeatmapData | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

// SWR fetcher for hover heatmap
const hoverHeatmapFetcher = async ([, params]: [string, HoverHeatmapParams]): Promise<HoverHeatmapData> => {
    console.log('👁️ Fetching hover heatmap data:', params);

    // Prepare payload
    const payload = { ...params };
    const config = params.shareToken ? { headers: { 'x-share-token': params.shareToken } } : {};

    if (params.days) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - params.days);
        payload.startDate = start.toISOString();
        payload.endDate = end.toISOString();
        delete payload.days;
    }

    const result = await apiClient.post<HoverHeatmapData>('/hover-heatmap', payload, config);

    console.log('✓ Hover heatmap data fetched:', {
        pointCount: result.heatmapPoints?.length || 0,
        totalHoverTimeMs: result.totalHoverTimeMs,
    });

    return result;
};

export function useHoverHeatmapData(params: HoverHeatmapParams): UseHoverHeatmapDataResult {
    // Create stable cache key
    const cacheKey = useMemo(() => {
        if (!params.siteId || !params.pagePath) return null;
        return [
            '/api/hover-heatmap',
            {
                siteId: params.siteId,
                pagePath: params.pagePath,
                deviceType: params.deviceType,
                startDate: params.startDate,
                endDate: params.endDate,
                days: params.days,
                shareToken: params.shareToken
            }
        ] as [string, HoverHeatmapParams];
    }, [params.siteId, params.pagePath, params.deviceType, params.startDate, params.endDate, params.days, params.shareToken]);

    const { data, error, isLoading, mutate } = useSWR(
        cacheKey,
        hoverHeatmapFetcher,
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
