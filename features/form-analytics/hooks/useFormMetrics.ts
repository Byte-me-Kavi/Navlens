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
}: UseFormMetricsOptions) {
    const { data, error, isLoading, mutate } = useSWR<FormAnalyticsResponse>(
        enabled && siteId && formId ? ['form-metrics', siteId, formId, days] : null,
        () => formAnalyticsApi.getFormMetrics(siteId, formId!, days),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    // Calculate derived metrics
    const overallDropoff = useMemo(() => {
        if (!data?.fields) return 0;
        return formAnalyticsApi.calculateOverallDropoff(data.fields);
    }, [data?.fields]);

    const worstRefillField = useMemo(() => {
        if (!data?.fields) return null;
        return formAnalyticsApi.findWorstRefillField(data.fields);
    }, [data?.fields]);

    const avgTimeMs = useMemo(() => {
        if (!data?.fields || data.fields.length === 0) return 0;
        const total = data.fields.reduce((sum, f) => sum + f.avg_time_ms, 0);
        return Math.round(total / data.fields.length);
    }, [data?.fields]);

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
