/**
 * useFunnelAnalysis Hook
 * 
 * Custom hook for fetching and managing funnel analysis data with SWR caching
 */

import useSWR from 'swr';
import { useMemo } from 'react';
import { funnelApi } from '../services/funnelApi';
import { FunnelAnalysis, FunnelAnalysisParams } from '../types/funnel.types';

interface UseFunnelAnalysisResult {
  data: FunnelAnalysis | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// SWR fetcher for funnel analysis
const analysisFetcher = async ([, params]: [string, FunnelAnalysisParams]): Promise<FunnelAnalysis> => {
  console.log('📊 Analyzing funnel:', params.funnelId);
  const result = await funnelApi.analyzeFunnel(params);
  console.log('✓ Funnel analysis complete:', {
    steps: result.step_results?.length || 0,
    totalSessions: result.total_sessions,
  });
  return result;
};

export function useFunnelAnalysis(params: FunnelAnalysisParams | null): UseFunnelAnalysisResult {
  // Create stable cache key - use params as single dependency for React Compiler
  const cacheKey = useMemo(() => {
    if (!params) return null;
    if (!params.funnelId || !params.siteId) return null;
    return [
      '/api/funnels/analyze',
      {
        funnelId: params.funnelId,
        siteId: params.siteId,
        startDate: params.startDate,
        endDate: params.endDate,
      }
    ] as [string, FunnelAnalysisParams];
  }, [params]);

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    analysisFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 120000, // 2 minutes - analysis can be heavy
      errorRetryCount: 2,
    }
  );

  return {
    data: data || null,
    loading: isLoading,
    error: error || null,
    refetch: async () => { await mutate(undefined, true); },
  };
}
