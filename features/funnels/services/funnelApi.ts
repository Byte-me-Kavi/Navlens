/**
 * Funnels API Service
 * 
 * Handles all funnel-related API requests.
 * Uses RESTful API pattern with encrypted responses.
 */

import { apiClient } from '@/shared/services/api/client';
import {
  Funnel,
  FunnelWithStats,
  CreateFunnelRequest,
  UpdateFunnelRequest,
  FunnelAnalysis,
} from '../types/funnel.types';

export interface ListFunnelsParams {
  siteId: string;
}

export interface AnalyzeFunnelParams {
  siteId: string;
  funnelId: string;
  startDate?: string;
  endDate?: string;
}

export const funnelApi = {
  /**
   * List all funnels for a site
   */
  async listFunnels(params: ListFunnelsParams): Promise<FunnelWithStats[]> {
    const queryParams = new URLSearchParams({
      siteId: params.siteId,
    });
    const response = await apiClient.get<{ funnels: FunnelWithStats[] }>(`/funnels?${queryParams}`);
    return response.funnels || [];
  },

  /**
   * Get a specific funnel with analysis
   */
  async getFunnelWithAnalysis(
    funnelId: string,
    siteId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ funnel: Funnel; analysis: FunnelAnalysis }> {
    const queryParams = new URLSearchParams({
      siteId,
      funnelId,
      action: 'analyze',
    });
    if (startDate) queryParams.set('startDate', startDate);
    if (endDate) queryParams.set('endDate', endDate);
    
    return await apiClient.get<{ funnel: Funnel; analysis: FunnelAnalysis }>(`/funnels?${queryParams}`);
  },

  /**
   * Create a new funnel
   */
  async createFunnel(params: CreateFunnelRequest): Promise<Funnel> {
    const response = await apiClient.post<{ funnel: Funnel; message: string }>('/funnels', {
      site_id: params.site_id,
      name: params.name,
      description: params.description,
      steps: params.steps,
    });
    return response.funnel;
  },

  /**
   * Update an existing funnel
   */
  async updateFunnel(params: UpdateFunnelRequest): Promise<Funnel> {
    const response = await apiClient.put<{ funnel: Funnel; message: string }>('/funnels', {
      id: params.id,
      site_id: params.site_id,
      name: params.name,
      description: params.description,
      steps: params.steps,
      is_active: params.is_active,
    });
    return response.funnel;
  },

  /**
   * Delete a funnel
   */
  async deleteFunnel(funnelId: string, siteId: string): Promise<void> {
    const queryParams = new URLSearchParams({
      id: funnelId,
      siteId,
    });
    await apiClient.delete(`/funnels?${queryParams}`);
  },

  /**
   * Analyze a funnel - get conversion rates
   */
  async analyzeFunnel(params: AnalyzeFunnelParams): Promise<FunnelAnalysis> {
    const { funnel, analysis } = await this.getFunnelWithAnalysis(
      params.funnelId,
      params.siteId,
      params.startDate,
      params.endDate
    );
    return { ...analysis, funnel };
  },
};
