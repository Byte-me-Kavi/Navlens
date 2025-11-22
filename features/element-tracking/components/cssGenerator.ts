/**
 * CSS Prescription Generator
 * 
 * Generates CSS recommendations based on element analysis
 */

import type { ElementClick } from '../types/element.types';

export function generatePrescription(
  element: ElementClick,
  metrics: {
    ctr: number;
    ctrTrend: number;
    deviceBreakdown: { desktop: number; tablet: number; mobile: number };
    scrollDepth: number;
    scrollDepthTrend: number;
    isImportant: boolean;
    rageClicks: number;
    deadClicks: number;
    siteAvgCTR: number;
  }
): Array<{
  type: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  cssSnippet?: string;
}> {
  const prescriptions = [];

  // Low CTR recommendation
  if (metrics.ctr < metrics.siteAvgCTR) {
    prescriptions.push({
      type: 'visibility',
      title: 'Improve Visibility',
      description: 'This element has below-average click-through rate',
      action: 'Increase size, contrast, or add visual indicators',
      impact: '+15-30% CTR improvement expected',
      cssSnippet: `/* Make element more prominent */
.${element.tag.toLowerCase()} {
  font-size: 1.1em;
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`,
    });
  }

  // Rage clicks recommendation
  if (metrics.rageClicks > 3) {
    prescriptions.push({
      type: 'technical',
      title: 'Fix Technical Issues',
      description: 'Multiple rapid clicks suggest technical problems',
      action: 'Check for JavaScript errors, slow responses, or broken functionality',
      impact: 'Critical - May be preventing conversions',
    });
  }

  // Good performance
  if (metrics.ctr > metrics.siteAvgCTR * 1.5) {
    prescriptions.push({
      type: 'success',
      title: 'Excellent Performance',
      description: 'This element is performing above average',
      action: 'Maintain current design and consider replicating for similar elements',
      impact: 'Keep monitoring to ensure sustained performance',
    });
  }

  return prescriptions;
}
