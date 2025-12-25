/**
 * useElementClicks Hook
 * 
 * Manages element click data fetching and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { elementApi } from '../services/elementApi';
import { ElementClick, ElementClickParams } from '../types/element.types';

interface UseElementClicksResult {
  data: ElementClick[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Extended params to include days
interface ExtendedElementClickParams extends ElementClickParams {
  days?: number;
}

export function useElementClicks(params: ExtendedElementClickParams): UseElementClicksResult {
  const [data, setData] = useState<ElementClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRequestHash, setLastRequestHash] = useState<string | null>(null);

  // Memoize params including days
  const memoizedParams = useMemo(() => {
    // If days is provided, calculate start/end date overrides
    if (params.days) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - params.days);

      return {
        ...params,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };
    }
    return params;
  }, [params]);

  // Create a hash of the request to detect duplicates
  const paramsHash = JSON.stringify(memoizedParams);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔴 Fetching element clicks:', memoizedParams);

      // Skip if we've already fetched this exact request
      if (lastRequestHash === paramsHash) {
        console.log('⏭️ Skipping duplicate element clicks request');
        return;
      }

      const result = await elementApi.getElementClicks(memoizedParams);
      setLastRequestHash(paramsHash);

      console.log('✓ Element clicks fetched:', result.length, 'elements');

      setData(result);
    } catch (err) {
      console.error('❌ Error fetching element clicks:', err);
      setError(err as Error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams, lastRequestHash, paramsHash]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!cancelled && lastRequestHash !== paramsHash) {
        await fetchData();
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [paramsHash, lastRequestHash, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
