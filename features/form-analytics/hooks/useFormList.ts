/**
 * useFormList Hook
 * Fetches list of tracked forms with summary metrics
 */

'use client';

import useSWR from 'swr';
import { formAnalyticsApi } from '../services/formAnalyticsApi';
import { FormAnalyticsResponse, UseFormListOptions } from '../types/formAnalytics.types';

export function useFormList({
    siteId,
    days = 7,
    enabled = true,
}: UseFormListOptions) {
    const { data, error, isLoading, mutate } = useSWR<FormAnalyticsResponse>(
        enabled && siteId ? ['form-list', siteId, days] : null,
        () => formAnalyticsApi.getFormList(siteId, days),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    return {
        forms: data?.forms || [],
        summary: data?.summary,
        isLoading,
        error: error as Error | undefined,
        refresh: () => mutate(),
    };
}

export default useFormList;
