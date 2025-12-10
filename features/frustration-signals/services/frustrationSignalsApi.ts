import { apiClient } from '@/shared/services/api/client';
import {
    FrustrationSignalsData,
    HoverHeatmapData,
    CursorPathsData
} from '../types/frustrationSignals.types';

interface FrustrationSignalsParams {
    siteId: string;
    pagePath: string;
    startDate?: string;
    endDate?: string;
}

interface HoverHeatmapParams {
    siteId: string;
    pagePath: string;
    deviceType?: string;
    startDate?: string;
    endDate?: string;
}

interface CursorPathsParams {
    siteId: string;
    pagePath: string;
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export const frustrationSignalsApi = {
    /**
     * Get aggregated frustration signals for a page
     */
    getFrustrationSignals: async (params: FrustrationSignalsParams): Promise<FrustrationSignalsData> => {
        return apiClient.post<FrustrationSignalsData>('/frustration-signals', params);
    },

    /**
     * Get hover/attention heatmap data
     */
    getHoverHeatmap: async (params: HoverHeatmapParams): Promise<HoverHeatmapData> => {
        return apiClient.post<HoverHeatmapData>('/hover-heatmap', params);
    },

    /**
     * Get cursor path analysis data
     */
    getCursorPaths: async (params: CursorPathsParams): Promise<CursorPathsData> => {
        return apiClient.post<CursorPathsData>('/cursor-paths', params);
    },
};
