/**
 * Secure API Client
 * 
 * Enhanced API client that wraps the existing apiClient with:
 * - Request queue (max 3 concurrent)
 * - Automatic parameter encryption
 * - POST-first approach (no sensitive data in URLs)
 * 
 * @example
 * import { secureApi } from '@/lib/secureApi';
 * const data = await secureApi.experiments.list(siteId);
 */

import { apiClient, ApiError } from '@/shared/services/api/client';
// Import directly from requestQueue to avoid loading server-only cors.ts
import { requestQueue } from '@/lib/security/requestQueue';

// Re-export ApiError for convenience
export { ApiError };

/**
 * Secure API wrapper with domain-specific methods
 */
export const secureApi = {
    /**
     * Experiments API
     */
    experiments: {
        list: (siteId: string, options?: { status?: string; activeOnly?: boolean }) =>
            requestQueue.add(() =>
                apiClient.post<{ experiments: unknown[] }>('/experiments/query', {
                    siteId,
                    ...options,
                })
            ),

        get: (experimentId: string, siteId: string) =>
            requestQueue.add(() =>
                apiClient.post<{ experiment: unknown }>('/experiments/get', {
                    experimentId,
                    siteId,
                })
            ),

        create: (data: unknown) =>
            requestQueue.add(() =>
                apiClient.post<{ experiment: unknown }>('/experiments', data)
            ),

        update: (experimentId: string, data: unknown) =>
            requestQueue.add(() =>
                apiClient.patch<{ experiment: unknown }>(`/experiments/${experimentId}`, data)
            ),

        delete: (experimentId: string, siteId: string) =>
            requestQueue.add(() =>
                apiClient.delete<{ success: boolean }>(`/experiments/${experimentId}`, { siteId })
            ),

        results: (siteId: string, experimentId: string, options?: { startDate?: string; endDate?: string }) =>
            requestQueue.add(() =>
                apiClient.post<{ results: unknown }>('/experiments/results/query', {
                    siteId,
                    experimentId,
                    ...options,
                })
            ),

        modifications: {
            get: (experimentId: string, siteId: string) =>
                requestQueue.add(() =>
                    apiClient.post<{ modifications: unknown[] }>('/experiments/modifications/query', {
                        experimentId,
                        siteId,
                    })
                ),

            save: (data: unknown) =>
                requestQueue.add(() =>
                    apiClient.post<{ success: boolean }>('/experiments/modifications', data)
                ),
        },

        editorUrl: (data: { experimentId: string; siteId: string; variantId: string }) =>
            requestQueue.add(() =>
                apiClient.post<{ url: string }>('/experiments/editor-url', data)
            ),
    },

    /**
     * Cohorts API
     */
    cohorts: {
        list: (siteId: string) =>
            requestQueue.add(() =>
                apiClient.post<{ cohorts: unknown[] }>('/cohorts/query', { siteId })
            ),

        create: (data: unknown) =>
            requestQueue.add(() =>
                apiClient.post<{ cohort: unknown }>('/cohorts', data)
            ),

        delete: (cohortId: string) =>
            requestQueue.add(() =>
                apiClient.delete<{ success: boolean }>('/cohorts', { id: cohortId })
            ),

        metrics: (data: unknown) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/cohort-metrics', data)
            ),
    },

    /**
     * Feedback API
     */
    feedback: {
        list: (siteId: string, options?: { limit?: number; offset?: number }) =>
            requestQueue.add(() =>
                apiClient.post<{ feedback: unknown[] }>('/feedback/query', {
                    siteId,
                    ...options,
                })
            ),

        config: (siteId: string) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/feedback-config/query', { siteId })
            ),

        dashboardList: (data: {
            siteId: string;
            startDate: string;
            endDate: string;
            feedbackType: string;
            page: number;
            limit: number;
        }) =>
            requestQueue.add(() =>
                apiClient.post<{
                    feedback: unknown[];
                    totalCount: number;
                    totalPages: number;
                    stats: unknown
                }>('/dashboard/feedback', data)
            ),
    },

    /**
     * Forms/Insights API
     */
    forms: {
        insights: (siteId: string, options?: { formId?: string; days?: number }) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/insights/forms/query', {
                    siteId,
                    ...options,
                })
            ),
    },

    /**
     * Funnels API
     */
    funnels: {
        list: (siteId: string) =>
            requestQueue.add(() =>
                apiClient.post<{ funnels: unknown[] }>('/funnels/query', {
                    siteId,
                    action: 'list',
                })
            ),

        analyze: (siteId: string, funnelId: string, options?: { startDate?: string; endDate?: string }) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/funnels/query', {
                    siteId,
                    funnelId,
                    action: 'analyze',
                    ...options,
                })
            ),

        create: (data: unknown) =>
            requestQueue.add(() =>
                apiClient.post<{ funnel: unknown }>('/funnels', data)
            ),

        delete: (funnelId: string, siteId: string) =>
            requestQueue.add(() =>
                apiClient.delete<{ success: boolean }>('/funnels', { id: funnelId, siteId })
            ),
    },

    /**
     * Sessions API
     */
    sessions: {
        list: (siteId: string, options?: {
            page?: number;
            pageSize?: number;
            filters?: Record<string, unknown>;
        }) =>
            requestQueue.add(() =>
                apiClient.post<{ sessions: unknown[]; pagination: unknown }>('/sessions', {
                    siteId,
                    ...options,
                })
            ),

        get: (sessionId: string, siteId: string) =>
            requestQueue.add(() =>
                apiClient.post<{ session: unknown }>('/sessions/get', {
                    sessionId,
                    siteId,
                })
            ),

        replayEvents: (sessionId: string, siteId: string) =>
            requestQueue.add(() =>
                apiClient.post<{ events: unknown[] }>('/rrweb-events/query', {
                    sessionId,
                    siteId,
                })
            ),

        notes: {
            list: (sessionId: string, siteId: string) =>
                requestQueue.add(() =>
                    apiClient.post<{ notes: unknown[] }>('/session-notes/query', {
                        sessionId,
                        siteId,
                    })
                ),

            create: (data: unknown) =>
                requestQueue.add(() =>
                    apiClient.post<{ note: unknown }>('/session-notes', data)
                ),

            delete: (noteId: string) =>
                requestQueue.add(() =>
                    apiClient.delete<{ success: boolean }>('/session-notes', { id: noteId })
                ),
        },

        debugData: (sessionId: string, siteId: string, options?: { type?: string; limit?: number }) =>
            requestQueue.add(() =>
                apiClient.post<unknown>(`/sessions/${sessionId}/debug-data/query`, {
                    siteId,
                    ...options,
                })
            ),
    },

    /**
     * Heatmaps API
     */
    heatmaps: {
        clicks: (siteId: string, pagePath: string, options?: { deviceType?: string }) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/heatmap-clicks/query', {
                    siteId,
                    pagePath,
                    ...options,
                })
            ),

        snapshot: (siteId: string, pagePath: string, deviceType?: string) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/get-snapshot/query', {
                    siteId,
                    pagePath,
                    deviceType,
                })
            ),
    },

    /**
     * Performance API
     */
    performance: {
        metrics: (data: unknown) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/performance-metrics', data)
            ),
    },

    /**
     * User Journeys API
     */
    journeys: {
        get: (data: unknown) =>
            requestQueue.add(() =>
                apiClient.post<unknown>('/user-journeys', data)
            ),
    },

    /**
     * Sites API
     */
    sites: {
        paths: {
            list: (siteId: string) =>
                requestQueue.add(() =>
                    apiClient.post<{ pagePaths: string[] }>('/manage-page-paths', { siteId })
                ),

            delete: (siteId: string, pagePath: string) =>
                requestQueue.add(() =>
                    apiClient.delete<{ success: boolean }>('/manage-page-paths', { siteId, pagePath })
                ),

            exclude: (siteId: string, pagePath: string) =>
                requestQueue.add(() =>
                    apiClient.post<{ success: boolean }>('/excluded-paths', { siteId, pagePath })
                ),
        },
    },

    /**
     * Dashboard API
     */
    dashboard: {
        stats: () =>
            requestQueue.add(() =>
                apiClient.get<unknown>('/dashboard-stats')
            ),
    },
};

// Default export
export default secureApi;
