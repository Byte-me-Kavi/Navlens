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
  radius: 30,
  maxOpacity: 0.9,
  minOpacity: 0,
  blur: 0.4,
  gradient: {
    '0.0': 'blue',
    '0.25': 'cyan',
    '0.5': 'lime',
    '0.75': 'yellow',
    '1.0': 'red',
  },
};
