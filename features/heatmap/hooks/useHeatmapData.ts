/**
 * useHeatmapData Hook
 * 
 * Custom hook for fetching and managing heatmap data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { heatmapApi } from '../services/heatmapApi';
import { HeatmapParams, HeatmapPoint } from '../types/heatmap.types';

interface UseHeatmapDataResult {
  data: HeatmapPoint[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHeatmapData(params: HeatmapParams): UseHeatmapDataResult {
  const [data, setData] = useState<HeatmapPoint[]>([]);
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

      console.log('🔥 Fetching heatmap data:', params);

      // Skip if we've already fetched this exact request
      if (lastRequestHash === paramsHash) {
        console.log('⏭️ Skipping duplicate heatmap request');
        return;
      }

      const result = await heatmapApi.getHeatmapClicks(memoizedParams);
      setLastRequestHash(paramsHash);

      console.log('✓ Heatmap data fetched:', {
        pointCount: result.length,
        samplePoint: result[0],
        hasRelativeCoords: result[0]?.x_relative !== undefined,
      });
      
      if (result.length === 0) {
        console.warn('⚠️ No heatmap data returned from API');
        console.warn('   Possible reasons:');
        console.warn('   1. No clicks recorded yet for this page');
        console.warn('   2. Clicks recorded before document dimensions fix (document_width=0)');
        console.warn('   3. Generate new clicks on your site to see heatmap data');
      }

      setData(result);
    } catch (err) {
      console.error('❌ Error fetching heatmap data:', err);
      setError(err as Error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams, lastRequestHash, paramsHash, params]);

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
