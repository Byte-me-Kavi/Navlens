/**
 * Element Tracking Types
 */

export interface ElementClick {
  tag: string;
  selector: string;
  text: string;
  href?: string;
  x: number;
  y: number;
  x_relative?: number; // Relative x position (0-1) for accurate cross-viewport positioning
  y_relative?: number; // Relative y position (0-1) for accurate cross-viewport positioning
  document_width?: number;
  document_height?: number;
  width?: number;
  height?: number;
  clickCount: number;
  percentage: number;
  avgTimeToClick?: number;
}

export interface ElementClickParams {
  siteId: string;
  pagePath: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  documentWidth?: number;
  documentHeight?: number;
  startDate?: string;
  endDate?: string;
}

export interface ElementAnalysis {
  reality: {
    ctr: number;
    ctrTrend: number;
    ctrBenchmark: string;
    deviceBreakdown: {
      desktop: number;
      tablet: number;
      mobile: number;
    };
    scrollDepth: number;
    scrollDepthTrend: number;
    position: string;
    siteAvgCTR: number;
  };
  diagnosis: {
    frustrationIndex: string;
    frustrationExplanation: string;
    confusionIndex: string;
    confusionExplanation: string;
    hesitationScore: string;
    hesitationExplanation: string;
    attractionRank: string;
  };
  prescription: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
    impact: string;
    cssSnippet?: string;
  }>;
}
