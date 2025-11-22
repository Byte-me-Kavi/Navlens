/**
 * DOM Snapshot API Service
 * 
 * Uses POST requests for security
 */

import { apiClient } from '@/shared/services/api/client';
import { SnapshotData, SnapshotParams } from '../types/snapshot.types';

export const snapshotApi = {
  /**
   * Fetch DOM snapshot data using POST request
   */
  async getSnapshot(params: SnapshotParams): Promise<SnapshotData> {
    const response = await apiClient.post<any>('/get-snapshot', {
      siteId: params.siteId,
      pagePath: params.pagePath,
      deviceType: params.deviceType,
    });

    // Handle different response formats
    if (response.snapshot) {
      return {
        snapshot: response.snapshot,
        styles: response.styles || [],
        origin: response.origin || window.location.origin,
      };
    }

    // Legacy format
    return {
      snapshot: response,
      styles: [],
      origin: window.location.origin,
    };
  },
};
