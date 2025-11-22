/**
 * Element Tracking API Service
 * 
 * Handles all element click tracking API requests using POST for security
 */

import { apiClient } from '@/shared/services/api/client';
import { ElementClick, ElementClickParams } from '../types/element.types';

export const elementApi = {
  /**
   * Fetch element click data using POST request
   */
  async getElementClicks(params: ElementClickParams): Promise<ElementClick[]> {
    const data = await apiClient.post<ElementClick[]>('/element-clicks', {
      siteId: params.siteId,
      pagePath: params.pagePath,
      deviceType: params.deviceType,
      documentWidth: params.documentWidth,
      documentHeight: params.documentHeight,
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate })
    });

    return data;
  },

  /**
   * Fetch element metrics for analysis using POST request
   */
  async getElementMetrics(params: {
    siteId: string;
    pagePath: string;
    deviceType: string;
    startDate: string;
    endDate: string;
    elementSelector: string;
  }): Promise<any> {
    return apiClient.post('/elements-metrics-data', params);
  },
};
