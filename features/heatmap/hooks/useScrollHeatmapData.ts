// features/heatmap/hooks/useScrollHeatmapData.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '@/shared/services/api/client';

interface ScrollDataPoint {
  scroll_percentage: number;
  sessions: number;
}

interface ScrollHeatmapData {
  totalSessions: number;
  scrollData: ScrollDataPoint[];
}

interface UseScrollHeatmapDataParams {
  siteId: string;
  pagePath: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  startDate?: string;
  endDate?: string;
}

export function useScrollHeatmapData(params: UseScrollHeatmapDataParams) {
  const [data, setData] = useState<ScrollHeatmapData>({ totalSessions: 0, scrollData: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedParams = useMemo(() => params, [params]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.post<ScrollHeatmapData>('/heatmap-scrolls', memoizedParams);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [memoizedParams]);

  useEffect(() => {
    if (memoizedParams.siteId && memoizedParams.pagePath) {
      fetchData();
    }
  }, [memoizedParams, fetchData]); // Include fetchData to satisfy exhaustive-deps

  return { data, loading, error, refetch: fetchData };
}
