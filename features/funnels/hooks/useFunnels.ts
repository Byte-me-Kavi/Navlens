/**
 * useFunnels Hook
 * 
 * Custom hook for managing funnel list with SWR caching
 */

import useSWR from 'swr';
import { useMemo, useCallback } from 'react';
import { funnelApi } from '../services/funnelApi';
import { FunnelWithStats, CreateFunnelRequest, UpdateFunnelRequest } from '../types/funnel.types';

interface UseFunnelsResult {
  funnels: FunnelWithStats[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createFunnel: (params: CreateFunnelRequest) => Promise<void>;
  updateFunnel: (params: UpdateFunnelRequest) => Promise<void>;
  deleteFunnel: (funnelId: string) => Promise<void>;
}

// SWR fetcher for funnels list
const funnelsFetcher = async ([, siteId]: [string, string]): Promise<FunnelWithStats[]> => {
  console.log('🔄 Fetching funnels for site:', siteId);
  const result = await funnelApi.listFunnels({ siteId });
  console.log('✓ Funnels fetched:', result.length);
  return result;
};

export function useFunnels(siteId: string | null): UseFunnelsResult {
  // Create stable cache key
  const cacheKey = useMemo(() => {
    if (!siteId) return null;
    return ['/api/funnels/list', siteId] as [string, string];
  }, [siteId]);

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    funnelsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 2,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const createFunnel = useCallback(async (params: CreateFunnelRequest) => {
    const newFunnel = await funnelApi.createFunnel(params);
    // Optimistically add to the list
    mutate((current) => [...(current || []), newFunnel], false);
  }, [mutate]);

  const updateFunnel = useCallback(async (params: UpdateFunnelRequest) => {
    await funnelApi.updateFunnel(params);
    await mutate(); // Refresh the list
  }, [mutate]);

  const deleteFunnel = useCallback(async (funnelId: string) => {
    if (!siteId) return;
    // Optimistically remove from the list
    mutate((current) => (current || []).filter(f => f.id !== funnelId), false);
    try {
      await funnelApi.deleteFunnel(funnelId, siteId);
      // Force revalidation to ensure server state is synced
      await mutate();
    } catch (error) {
      // Revert on error
      await mutate();
      throw error; // Re-throw so UI can handle it
    }
  }, [siteId, mutate]);

  return {
    funnels: data || [],
    loading: isLoading,
    error: error || null,
    refetch,
    createFunnel,
    updateFunnel,
    deleteFunnel,
  };
}
