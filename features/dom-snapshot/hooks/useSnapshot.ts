/**
 * useSnapshot Hook
 * 
 * Manages snapshot data fetching and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { snapshotApi } from '../services/snapshotApi';
import { SnapshotData, SnapshotParams } from '../types/snapshot.types';

interface UseSnapshotResult {
  data: SnapshotData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSnapshot(params: SnapshotParams): UseSnapshotResult {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRequestHash, setLastRequestHash] = useState<string | null>(null);

  // Memoize params to prevent unnecessary re-renders
  const memoizedParams = useMemo(() => params, [params]);

  // Create a hash of the request to detect duplicates
  const paramsHash = JSON.stringify(memoizedParams);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📸 [useSnapshot] Fetching snapshot with params:', {
        siteId: params.siteId,
        pagePath: params.pagePath,
        deviceType: params.deviceType,
      });

      // Skip if we've already fetched this exact request
      if (lastRequestHash === paramsHash) {
        console.log('⏭️ Skipping duplicate snapshot request');
        return;
      }

      const result = await snapshotApi.getSnapshot(memoizedParams);
      setLastRequestHash(paramsHash);

      console.log('✓ [useSnapshot] Snapshot fetched successfully');

      setData(result);
    } catch (err) {
      console.error('❌ [useSnapshot] Error fetching snapshot:', err);
      console.error('❌ [useSnapshot] Failed params:', {
        siteId: memoizedParams.siteId,
        pagePath: memoizedParams.pagePath,
        deviceType: memoizedParams.deviceType,
      });
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams, lastRequestHash, paramsHash, params]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!cancelled) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
