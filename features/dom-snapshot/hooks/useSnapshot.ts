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
// Cache for "not found" errors to prevent repeated failed requests
const notFoundCache = new Map<string, { timestamp: number; error: Error }>();

// How long to cache "not found" errors (5 minutes)
const NOT_FOUND_CACHE_TTL = 5 * 60 * 1000;

// Clean up old cache entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();

  // Clean result cache
  if (resultCache.size > 50) {
    const keys = Array.from(resultCache.keys());
    const keysToDelete = keys.slice(0, keys.length - 50);
    keysToDelete.forEach(key => resultCache.delete(key));
  }

  // Clean expired "not found" cache entries
  notFoundCache.forEach((value, key) => {
    if (now - value.timestamp > NOT_FOUND_CACHE_TTL) {
      notFoundCache.delete(key);
    }
  });
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

  // Create stable cache key from params
  const paramsHash = useMemo(() =>
    `${params.siteId}:${params.pagePath}:${params.deviceType}`,
    [params.siteId, params.pagePath, params.deviceType]
  );

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check if we already have this data cached
      if (!forceRefresh && resultCache.has(paramsHash)) {
        console.log('💾 [useSnapshot] Using cached snapshot data');
        setData(resultCache.get(paramsHash)!);
        setLoading(false);
        return;
      }

      // Check if this request previously returned "not found" (within TTL)
      const notFoundEntry = notFoundCache.get(paramsHash);
      if (!forceRefresh && notFoundEntry) {
        const age = Date.now() - notFoundEntry.timestamp;
        if (age < NOT_FOUND_CACHE_TTL) {
          console.log(`💨 [useSnapshot] Using cached "not found" result (age: ${Math.round(age / 1000)}s)`);
          setError(notFoundEntry.error);
          setData(null);
          setLoading(false);
          return;
        } else {
          // TTL expired, remove from cache and try again
          notFoundCache.delete(paramsHash);
        }
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
      const requestPromise = snapshotApi.getSnapshot(params);
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
      const error = err as Error;
      console.error('❌ [useSnapshot] Error fetching snapshot:', error.message);

      // Check if this is a "not found" error - cache it to prevent retries
      const errorMessage = error.message || '';
      const isNotFound =
        errorMessage.includes('Snapshot not found') ||
        errorMessage.includes('NOT_FOUND') ||
        errorMessage.includes('404') ||
        errorMessage.includes('No snapshot');

      if (isNotFound) {
        // Create a more user-friendly error
        const friendlyError = new Error('No snapshot available - visitors need to stay on the page for at least 5 seconds');
        (friendlyError as Error & { code: string }).code = 'SNAPSHOT_NOT_FOUND';

        // Cache the "not found" result to prevent repeated requests
        notFoundCache.set(paramsHash, {
          timestamp: Date.now(),
          error: friendlyError,
        });

        console.log('📝 [useSnapshot] Caching "not found" result for', paramsHash);
        setError(friendlyError);
      } else {
        setError(error);
      }

      setData(null);

      // Clean up failed request from cache
      requestCache.delete(paramsHash);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params already decomposed into individual deps above
  }, [params.siteId, params.pagePath, params.deviceType, paramsHash]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!cancelled && params.siteId) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally only using paramsHash to prevent infinite loops
  }, [paramsHash]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true), // Force refresh bypasses cache
  };
}

