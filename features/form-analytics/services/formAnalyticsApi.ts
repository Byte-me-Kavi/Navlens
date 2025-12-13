/**
 * Form Analytics API Service
 */

import { apiClient } from '@/shared/services/api/client';
import { FormAnalyticsResponse, FormSummary, FieldMetrics } from '../types/formAnalytics.types';

/**
 * Get list of forms with summary metrics
 */
export async function getFormList(
    siteId: string,
    days: number = 7
): Promise<FormAnalyticsResponse> {
    const params = new URLSearchParams({
        siteId,
        days: days.toString(),
    });

    return apiClient.get<FormAnalyticsResponse>(`/insights/forms?${params.toString()}`);
}

/**
 * Get detailed metrics for a specific form
 */
export async function getFormMetrics(
    siteId: string,
    formId: string,
    days: number = 7
): Promise<FormAnalyticsResponse> {
    const params = new URLSearchParams({
        siteId,
        formId,
        days: days.toString(),
        fields: 'true',
    });

    return apiClient.get<FormAnalyticsResponse>(`/insights/forms?${params.toString()}`);
}

/**
 * Calculate overall drop-off rate from fields
 */
export function calculateOverallDropoff(fields: FieldMetrics[]): number {
    if (!fields || fields.length < 2) return 0;

    const firstField = fields[0];
    const lastField = fields[fields.length - 1];

    // Prevent division by zero and handle edge cases
    if (!firstField.focus_count || firstField.focus_count === 0) return 0;
    if (!lastField.blur_count && lastField.blur_count !== 0) return 0;

    const dropoff = Math.round((1 - lastField.blur_count / firstField.focus_count) * 100);

    // Handle edge cases like NaN, Infinity, -Infinity
    if (!Number.isFinite(dropoff) || Number.isNaN(dropoff)) return 0;

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, dropoff));
}

/**
 * Find the field with highest refill rate
 */
export function findWorstRefillField(fields: FieldMetrics[]): FieldMetrics | null {
    if (!fields || fields.length === 0) return null;

    return fields.reduce((worst, current) => {
        if (!worst) return current;
        return current.refill_rate > worst.refill_rate ? current : worst;
    }, null as FieldMetrics | null);
}

/**
 * Format time in seconds for display
 */
export function formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get color for drop-off rate
 */
export function getDropoffColor(rate: number): string {
    // Handle invalid values
    if (!Number.isFinite(rate) || Number.isNaN(rate) || rate < 0) return '#22c55e'; // green-500 for invalid/0
    if (rate >= 30) return '#ef4444'; // red-500
    if (rate >= 15) return '#f59e0b'; // amber-500
    return '#22c55e'; // green-500
}

/**
 * Get color for refill rate
 */
export function getRefillColor(rate: number): string {
    if (rate >= 25) return '#ef4444'; // red-500
    if (rate >= 10) return '#f59e0b'; // amber-500
    return '#22c55e'; // green-500
}

export const formAnalyticsApi = {
    getFormList,
    getFormMetrics,
    calculateOverallDropoff,
    findWorstRefillField,
    formatTime,
    getDropoffColor,
    getRefillColor,
};
