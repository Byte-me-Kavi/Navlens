/**
 * Heatmap Renderer Service
 * 
 * Pure JavaScript service for creating and managing heatmap.js instances
 */

import h337 from 'heatmap.js';
import { HeatmapConfig, HeatmapData, DEFAULT_HEATMAP_CONFIG } from '../types/heatmap.types';

export class HeatmapRenderer {
  private instance: { setData: (data: HeatmapData) => void; addData: (data: HeatmapData) => void; removeData: () => void } | null = null;
  private container: HTMLElement | null = null;

  /**
   * Create a heatmap instance
   */
  create(container: HTMLElement, config?: HeatmapConfig): { setData: (data: HeatmapData) => void; addData: (data: HeatmapData) => void; removeData: () => void } {
    if (!container) {
      throw new Error('Container element is required');
    }

    this.container = container;
    
    const heatmapInstance = h337.create({
      container,
      ...DEFAULT_HEATMAP_CONFIG,
      ...config,
    });

    // Wrap the instance to add removeData method
    this.instance = {
      setData: heatmapInstance.setData.bind(heatmapInstance) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      addData: heatmapInstance.addData.bind(heatmapInstance) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      removeData: () => heatmapInstance.setData({ max: 0, min: 0, data: [] }),
    };

    return this.instance;
  }

  /**
   * Update heatmap data
   */
  setData(data: HeatmapData): void {
    if (!this.instance) {
      console.warn('Heatmap instance not created. Call create() first.');
      return;
    }

    this.instance.setData(data);
  }

  /**
   * Clear heatmap data
   */
  clear(): void {
    if (!this.instance) return;
    
    this.instance.setData({ max: 0, data: [] });
  }

  /**
   * Get the heatmap instance
   */
  getInstance(): { setData: (data: HeatmapData) => void; addData: (data: HeatmapData) => void; removeData: () => void } | null {
    return this.instance;
  }

  /**
   * Destroy the heatmap instance and clean up
   */
  destroy(): void {
    if (this.instance) {
      // heatmap.js doesn't have a destroy method, but we can clear it
      this.clear();
      this.instance = null;
    }
    
    this.container = null;
  }

  /**
   * Check if heatmap is initialized
   */
  isInitialized(): boolean {
    return this.instance !== null;
  }
}
