// features/heatmap/hooks/useScrollHeatmapData.ts
import useSWR from 'swr';
import { useMemo } from 'react';
import { apiClient } from '@/shared/services/api/client';

interface ScrollDataPoint {
  scroll_percentage: number;
  sessions: number;
}

interface ScrollHeatmapData {
  totalSessions: number;
  scrollData: ScrollDataPoint[];
}

interface UseScrollHeatmapDataParams {
  siteId: string;
  pagePath: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  startDate?: string;
  endDate?: string;
  days?: number;
}

// SWR fetcher for scroll heatmap data
const scrollFetcher = async ([_url, params]: [string, UseScrollHeatmapDataParams]): Promise<ScrollHeatmapData> => {
  console.log('📜 Fetching scroll heatmap data:', params);

  // Prepare payload with explicit dates if days provided
  const payload = { ...params };
  if (params.days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - params.days);
    payload.startDate = start.toISOString();
    payload.endDate = end.toISOString();
    delete payload.days; // Clean up
  }

  const result = await apiClient.post<ScrollHeatmapData>('/heatmap-scrolls', payload);
  console.log('✓ Scroll data fetched:', { totalSessions: result.totalSessions, dataPoints: result.scrollData?.length });
  return result;
};

export function useScrollHeatmapData(params: UseScrollHeatmapDataParams) {
  // Create stable cache key
  const cacheKey = useMemo(() => {
    if (!params.siteId || !params.pagePath) return null;
    return [
      '/api/heatmap-scrolls',
      {
        siteId: params.siteId,
        pagePath: params.pagePath,
        deviceType: params.deviceType,
        startDate: params.startDate,
        endDate: params.endDate,
        days: params.days // Include days in cache key
      }
    ] as [string, UseScrollHeatmapDataParams];
  }, [params.siteId, params.pagePath, params.deviceType, params.startDate, params.endDate, params.days]);

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    scrollFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 2,
    }
  );

  return {
    data: data ?? { totalSessions: 0, scrollData: [] },
    loading: isLoading,
    error: error ?? null,
    refetch: () => mutate(),
  };
}
