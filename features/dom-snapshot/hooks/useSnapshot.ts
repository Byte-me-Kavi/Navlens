/**
 * useSnapshot Hook
 * 
 * Manages snapshot data fetching and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { snapshotApi } from '../services/snapshotApi';
import { SnapshotData, SnapshotParams } from '../types/snapshot.types';

// Global cache to prevent duplicate requests across component instances
const requestCache = new Map<string, Promise<SnapshotData>>();
const resultCache = new Map<string, SnapshotData>();

// Clean up old cache entries periodically to prevent memory leaks
setInterval(() => {
  if (resultCache.size > 50) { // Keep only last 50 results
    const keys = Array.from(resultCache.keys());
    const keysToDelete = keys.slice(0, keys.length - 50);
    keysToDelete.forEach(key => resultCache.delete(key));
  }
}, 30000); // Clean every 30 seconds

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

  // Memoize params to prevent unnecessary re-renders
  const memoizedParams = useMemo(() => params, [params]);

  // Create a stable hash of the request parameters
  const paramsHash = useMemo(() => JSON.stringify(memoizedParams), [memoizedParams]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we already have this data cached
      if (resultCache.has(paramsHash)) {
        console.log('💾 [useSnapshot] Using cached snapshot data');
        setData(resultCache.get(paramsHash)!);
        setLoading(false);
        return;
      }

      // Check if there's already a request in progress for this hash
      if (requestCache.has(paramsHash)) {
        console.log('⏳ [useSnapshot] Waiting for existing request');
        const result = await requestCache.get(paramsHash)!;
        setData(result);
        setLoading(false);
        return;
      }

      console.log('📸 [useSnapshot] Fetching snapshot with params:', {
        siteId: params.siteId,
        pagePath: params.pagePath,
        deviceType: params.deviceType,
      });

      // Create and cache the request promise
      const requestPromise = snapshotApi.getSnapshot(memoizedParams);
      requestCache.set(paramsHash, requestPromise);

      const result = await requestPromise;

      // Cache the result
      resultCache.set(paramsHash, result);

      console.log('✓ [useSnapshot] Snapshot fetched and cached successfully');
      setData(result);

      // Clean up the request cache after a delay
      setTimeout(() => {
        requestCache.delete(paramsHash);
      }, 1000);

    } catch (err) {
      console.error('❌ [useSnapshot] Error fetching snapshot:', err);
      console.error('❌ [useSnapshot] Failed params:', {
        siteId: memoizedParams.siteId,
        pagePath: memoizedParams.pagePath,
        deviceType: memoizedParams.deviceType,
      });
      setError(err as Error);
      setData(null);

      // Clean up failed request from cache
      requestCache.delete(paramsHash);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams, params, paramsHash]);

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
  }, [paramsHash, fetchData]); // Only run when params change or fetchData changes

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
