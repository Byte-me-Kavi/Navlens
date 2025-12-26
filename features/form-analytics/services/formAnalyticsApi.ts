/**
 * Form Analytics API Service
 */

import { apiClient } from '@/shared/services/api/client';
import { FormAnalyticsResponse, FieldMetrics } from '../types/formAnalytics.types';

const withToken = (token?: string) => token ? { headers: { 'x-share-token': token } } : {};

/**
 * Get list of forms with summary metrics
 */
export async function getFormList(
    siteId: string,
    days: number = 7,
    shareToken?: string
): Promise<FormAnalyticsResponse> {
    const params = new URLSearchParams({
        siteId,
        days: days.toString(),
    });

    return apiClient.get<FormAnalyticsResponse>(`/insights/forms?${params.toString()}`, withToken(shareToken));
}

/**
 * Get detailed metrics for a specific form
 */
export async function getFormMetrics(
    siteId: string,
    formId: string,
    days: number = 7,
    shareToken?: string
): Promise<FormAnalyticsResponse> {
    const params = new URLSearchParams({
        siteId,
        formId,
        days: days.toString(),
        fields: 'true',
    });

    return apiClient.get<FormAnalyticsResponse>(`/insights/forms?${params.toString()}`, withToken(shareToken));
}

/**
 * Calculate overall drop-off rate from fields
 * This measures what percentage of users who started the form didn't reach the last field
 * If first-to-last comparison isn't meaningful, uses average of field-level drop-offs
 */
export function calculateOverallDropoff(fields: FieldMetrics[]): number {
    if (!fields || fields.length < 2) return 0;

    const firstField = fields[0];
    const lastField = fields[fields.length - 1];

    // Method 1: Calculate drop-off from first to last field
    let dropoff = 0;
    if (firstField.focus_count && firstField.focus_count > 0) {
        const startCount = firstField.focus_count;
        const endCount = lastField.focus_count;

        if (endCount < startCount) {
            dropoff = Math.round(((startCount - endCount) / startCount) * 100);
        }
    }

    // Method 2: If first-to-last shows 0%, calculate average of positive field drop-offs
    if (dropoff === 0) {
        const positiveDropoffs = fields
            .map(f => f.drop_off_rate)
            .filter(rate => rate > 0 && Number.isFinite(rate));

        if (positiveDropoffs.length > 0) {
            dropoff = Math.round(positiveDropoffs.reduce((sum, r) => sum + r, 0) / positiveDropoffs.length);
        }
    }

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
