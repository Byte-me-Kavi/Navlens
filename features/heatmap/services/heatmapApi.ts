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
    console.log('🔄 Transforming heatmap data:', {
      inputLength: clickData?.length || 0,
      docWidth: documentWidth,
      docHeight: documentHeight,
    });

    if (!clickData || clickData.length === 0) {
      console.warn('⚠️ No click data to transform');
      return { max: 0, data: [] };
    }

    const maxValue = Math.max(...clickData.map((d) => d.value));
    console.log('📊 Max value:', maxValue);

    const transformedData = clickData.map((point, index) => {
      // Use relative coordinates if available for responsive scaling
      if (point.x_relative !== undefined && point.y_relative !== undefined) {
        const x = Math.round(point.x_relative * documentWidth);
        const y = Math.round(point.y_relative * documentHeight);
        
        const transformed = {
          x: Math.max(0, Math.min(x, documentWidth)),
          y: Math.max(0, Math.min(y, documentHeight)),
          value: point.value,
        };
        
        if (index === 0) {
          console.log('🎯 Sample transformation:', {
            input: { x_rel: point.x_relative, y_rel: point.y_relative, value: point.value },
            output: transformed,
          });
        }
        
        return transformed;
      }

      // Fallback to absolute coordinates
      const fallback = {
        x: Math.round(point.x || 0),
        y: Math.round(point.y || 0),
        value: point.value,
      };
      
      if (index === 0) {
        console.log('⚠️ Using absolute coords (no relative):', fallback);
      }
      
      return fallback;
    });

    console.log('✓ Transformed data:', {
      outputLength: transformedData.length,
      max: maxValue,
      sampleOutput: transformedData[0],
    });

    return {
      max: maxValue,
      data: transformedData,
    };
  },
};
