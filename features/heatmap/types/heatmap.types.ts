/**
 * Heatmap Types
 * 
 * TypeScript interfaces and types for heatmap feature
 */

export interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  x_relative?: number;
  y_relative?: number;
  document_width?: number;
  document_height?: number;
}

export interface HeatmapData {
  max: number;
  data: HeatmapPoint[];
}

export interface HeatmapParams {
  siteId: string;
  pagePath: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  documentWidth?: number;
  documentHeight?: number;
  startDate?: string;
  endDate?: string;
}

export interface HeatmapConfig {
  radius?: number;
  maxOpacity?: number;
  minOpacity?: number;
  blur?: number;
  gradient?: Record<string, string>;
}

export const DEFAULT_HEATMAP_CONFIG: HeatmapConfig = {
  radius: 15,
  maxOpacity: 0.8,
  minOpacity: 0.1,
  blur: 0.75,
  gradient: {
    '0.0': 'rgba(0, 0, 255, 0)',
    '0.2': 'rgba(0, 200, 255, 0.5)',
    '0.4': 'rgba(0, 255, 0, 0.7)',
    '0.6': 'rgba(255, 255, 0, 0.8)',
    '0.8': 'rgba(255, 100, 0, 0.9)',
    '1.0': 'rgba(255, 0, 0, 1)',
  },
};
