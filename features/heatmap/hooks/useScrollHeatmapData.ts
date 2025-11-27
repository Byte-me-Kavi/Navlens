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
}

// SWR fetcher for scroll heatmap data
const scrollFetcher = async ([url, params]: [string, UseScrollHeatmapDataParams]): Promise<ScrollHeatmapData> => {
  console.log('📜 Fetching scroll heatmap data:', params);
  const result = await apiClient.post<ScrollHeatmapData>('/heatmap-scrolls', params);
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
      }
    ] as [string, UseScrollHeatmapDataParams];
  }, [params.siteId, params.pagePath, params.deviceType, params.startDate, params.endDate]);

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
