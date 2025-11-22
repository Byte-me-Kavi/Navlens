/**
 * useSnapshot Hook
 * 
 * Manages snapshot data fetching and state
 */

import { useState, useEffect, useCallback } from 'react';
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📸 Fetching snapshot:', params);

      const result = await snapshotApi.getSnapshot(params);

      console.log('✓ Snapshot fetched:', result);

      setData(result);
    } catch (err) {
      console.error('❌ Error fetching snapshot:', err);
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params.siteId, params.pagePath, params.deviceType]);

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
