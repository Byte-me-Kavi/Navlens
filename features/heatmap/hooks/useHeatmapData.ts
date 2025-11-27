/**
 * useHeatmapData Hook
 * 
 * Custom hook for fetching and managing heatmap data with SWR caching
 */

import useSWR from 'swr';
import { useMemo } from 'react';
import { heatmapApi } from '../services/heatmapApi';
import { HeatmapParams, HeatmapPoint } from '../types/heatmap.types';

interface UseHeatmapDataResult {
  data: HeatmapPoint[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// SWR fetcher for heatmap clicks
const heatmapFetcher = async ([url, params]: [string, HeatmapParams]): Promise<HeatmapPoint[]> => {
  console.log('🔥 Fetching heatmap data:', params);
  
  const result = await heatmapApi.getHeatmapClicks(params);
  
  console.log('✓ Heatmap data fetched:', {
    pointCount: result.length,
    samplePoint: result[0],
    hasRelativeCoords: result[0]?.x_relative !== undefined,
  });
  
  if (result.length === 0) {
    console.warn('⚠️ No heatmap data returned from API');
  }
  
  return result;
};

export function useHeatmapData(params: HeatmapParams): UseHeatmapDataResult {
  // Create stable cache key
  const cacheKey = useMemo(() => {
    if (!params.siteId || !params.pagePath) return null;
    return [
      '/api/heatmap-clicks',
      {
        siteId: params.siteId,
        pagePath: params.pagePath,
        deviceType: params.deviceType,
        documentWidth: params.documentWidth,
        documentHeight: params.documentHeight,
      }
    ] as [string, HeatmapParams];
  }, [params.siteId, params.pagePath, params.deviceType, params.documentWidth, params.documentHeight]);

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    heatmapFetcher,
    {
      // Optimal caching configuration
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes - prevent duplicate requests
      keepPreviousData: true,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      // Don't revalidate while navigating
      revalidateIfStale: false,
    }
  );

  return {
    data: data || [],
    loading: isLoading,
    error: error || null,
    refetch: async () => { await mutate(); },
  };
}
