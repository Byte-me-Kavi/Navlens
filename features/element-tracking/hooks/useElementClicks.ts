/**
 * useElementClicks Hook
 * 
 * Manages element click data fetching and state
 */

import { useState, useEffect, useCallback } from 'react';
import { elementApi } from '../services/elementApi';
import { ElementClick, ElementClickParams } from '../types/element.types';

interface UseElementClicksResult {
  data: ElementClick[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useElementClicks(params: ElementClickParams): UseElementClicksResult {
  const [data, setData] = useState<ElementClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔴 Fetching element clicks:', params);

      const result = await elementApi.getElementClicks(params);

      console.log('✓ Element clicks fetched:', result.length, 'elements');

      setData(result);
    } catch (err) {
      console.error('❌ Error fetching element clicks:', err);
      setError(err as Error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [params.siteId, params.pagePath, params.deviceType, params.startDate, params.endDate]);

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
