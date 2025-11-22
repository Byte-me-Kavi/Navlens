/**
 * Heatmap API Service
 * 
 * Handles all heatmap-related API requests using POST for security
 */

import { apiClient } from '@/shared/services/api/client';
import { HeatmapData, HeatmapParams, HeatmapPoint } from '../types/heatmap.types';

export const heatmapApi = {
  /**
   * Fetch heatmap click data from the API using POST request
   * POST is used instead of GET to avoid exposing sensitive data in URL
   */
  async getHeatmapClicks(params: HeatmapParams): Promise<HeatmapPoint[]> {
    const data = await apiClient.post<HeatmapPoint[]>('/heatmap-clicks', {
      siteId: params.siteId,
      pagePath: params.pagePath,
      deviceType: params.deviceType,
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
    });

    return data;
  },

  /**
   * Transform API data to heatmap.js format
   */
  transformToHeatmapData(
    clickData: HeatmapPoint[],
    documentWidth: number,
    documentHeight: number
  ): HeatmapData {
    if (!clickData || clickData.length === 0) {
      return { max: 0, data: [] };
    }

    const maxValue = Math.max(...clickData.map((d) => d.value));

    const transformedData = clickData.map((point) => {
      // Use relative coordinates if available for responsive scaling
      if (point.x_relative !== undefined && point.y_relative !== undefined) {
        const x = Math.round(point.x_relative * documentWidth);
        const y = Math.round(point.y_relative * documentHeight);
        
        return {
          x: Math.max(0, Math.min(x, documentWidth)),
          y: Math.max(0, Math.min(y, documentHeight)),
          value: point.value,
        };
      }

      // Fallback to absolute coordinates
      return {
        x: Math.round(point.x || 0),
        y: Math.round(point.y || 0),
        value: point.value,
      };
    });

    return {
      max: maxValue,
      data: transformedData,
    };
  },
};
