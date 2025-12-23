'use client';

import { useState, useEffect, useCallback } from 'react';
import { frustrationSignalsApi } from '../services/frustrationSignalsApi';
import { FrustrationSignalsData } from '../types/frustrationSignals.types';

interface UseFrustrationSignalsParams {
    siteId: string;
    pagePath: string;
    startDate?: string;
    endDate?: string;
}

interface UseFrustrationSignalsReturn {
    data: FrustrationSignalsData | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

export function useFrustrationSignals(params: UseFrustrationSignalsParams): UseFrustrationSignalsReturn {
    const [data, setData] = useState<FrustrationSignalsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        if (!params.siteId || !params.pagePath) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const result = await frustrationSignalsApi.getFrustrationSignals(params);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch frustration signals'));
            console.error('[useFrustrationSignals] Error:', err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.siteId, params.pagePath, params.startDate, params.endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refetch: fetchData,
    };
}
