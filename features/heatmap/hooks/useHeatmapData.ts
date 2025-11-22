/**
 * useHeatmapData Hook
 * 
 * Custom hook for fetching and managing heatmap data
 */

import { useState, useEffect, useCallback } from 'react';
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔥 Fetching heatmap data:', params);

      const result = await heatmapApi.getHeatmapClicks(params);

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
  }, [params.siteId, params.pagePath, params.deviceType, params.startDate, params.endDate]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      await fetchData();
      
      if (cancelled) {
        setData([]);
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
