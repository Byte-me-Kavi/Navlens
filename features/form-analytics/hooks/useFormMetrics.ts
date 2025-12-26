/**
 * useFormMetrics Hook
 * Fetches detailed field-level metrics for a specific form
 */

'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { formAnalyticsApi } from '../services/formAnalyticsApi';
import { FormAnalyticsResponse, UseFormMetricsOptions } from '../types/formAnalytics.types';

export function useFormMetrics({
    siteId,
    formId,
    days = 7,
    enabled = true,
    shareToken,
}: UseFormMetricsOptions) {
    const { data, error, isLoading, mutate } = useSWR<FormAnalyticsResponse>(
        enabled && siteId && formId ? ['form-metrics', siteId, formId, days, shareToken] : null,
        () => formAnalyticsApi.getFormMetrics(siteId, formId!, days, shareToken),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    // Extract fields for memoization
    const fields = data?.fields;

    // Calculate derived metrics
    const overallDropoff = useMemo(() => {
        if (!fields) return 0;
        return formAnalyticsApi.calculateOverallDropoff(fields);
    }, [fields]);

    const worstRefillField = useMemo(() => {
        if (!fields) return null;
        return formAnalyticsApi.findWorstRefillField(fields);
    }, [fields]);

    const avgTimeMs = useMemo(() => {
        if (!fields || fields.length === 0) return 0;
        const total = fields.reduce((sum, f) => sum + f.avg_time_ms, 0);
        return Math.round(total / fields.length);
    }, [fields]);

    return {
        fields: data?.fields || [],
        overallDropoff,
        worstRefillField,
        avgTimeMs,
        isLoading,
        error: error as Error | undefined,
        refresh: () => mutate(),
    };
}

export default useFormMetrics;
