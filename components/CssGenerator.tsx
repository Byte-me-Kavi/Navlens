interface ElementClick {
  selector: string;
  tag: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  clickCount: number;
  percentage: number;
  href?: string;
}

interface MockData {
  ctr: number;
  ctrTrend: number;
  deviceBreakdown: { desktop: number; tablet: number; mobile: number };
  scrollDepth: number;
  scrollDepthTrend: number;
  siteAvgCTR: number;
  isImportant: boolean;
  rageClicks: number;
  deadClicks: number | boolean;
}

interface Prescription {
  type: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  cssSnippet: string;
}

export const generatePrescription = (
  element: ElementClick,
  mockData: MockData
): Prescription[] => {
  const prescriptions: Prescription[] = [];

  // CTR-based prescriptions
  if (mockData.ctr < 1 && mockData.isImportant) {
    prescriptions.push({
      type: "visibility",
      title: "Visibility Issue Detected",
      description:
        "This important element is receiving low engagement. Consider moving it higher up the page or increasing visual prominence.",
      action: "Move above the fold or enhance contrast",
      impact: "Could increase conversion by 15-25%",
      cssSnippet: `/* Move element above the fold */
.element-selector {
  position: relative;
  z-index: 10;
  margin-top: -50px; /* Adjust as needed */
}

/* Or enhance visual prominence */
.element-selector {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  transform: scale(1.05);
}`,
    });
  }

  // Size-based prescriptions
  if (element.width < 120 || element.height < 35) {
    prescriptions.push({
      type: "size",
      title: "Size Optimization Needed",
      description:
        "The element is smaller than recommended for optimal usability, especially on mobile devices.",
      action: "Increase size to minimum 120px width × 44px height",
      impact: "Improves mobile tap accuracy by 40%",
      cssSnippet: `.element-selector {
  min-width: 120px;
  min-height: 44px;
  padding: 12px 24px;
  font-size: 16px; /* Prevents zoom on iOS */
}`,
    });
  }

  // Position-based prescriptions
  if (element.y > window.innerHeight * 0.8 && mockData.isImportant) {
    prescriptions.push({
      type: "position",
      title: "Below-the-Fold Challenge",
      description:
        "Important elements below the fold may be missed by most users who don't scroll.",
      action:
        "Move to upper portion of the page or add scroll-triggered animations",
      impact: "Increases visibility by 60-80%",
      cssSnippet: `/* Option 1: Move above fold */
.element-selector {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

/* Option 2: Add scroll animation */
.element-selector {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s ease;
}

.element-selector.animate {
  opacity: 1;
  transform: translateY(0);
}`,
    });
  }

  // Frustration-based prescriptions
  if (mockData.rageClicks > 3) {
    prescriptions.push({
      type: "technical",
      title: "Technical Issue Detected",
      description:
        "High rage clicking suggests users are experiencing technical problems or lack of feedback.",
      action:
        "Add loading states, hover effects, and ensure fast response times",
      impact: "Reduces user frustration and bounce rate",
      cssSnippet: `/* Add loading state */
.element-selector.loading {
  pointer-events: none;
  position: relative;
}

.element-selector.loading::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  margin: auto;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Hover feedback */
.element-selector:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s ease;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
    });
  }

  // Confusion-based prescriptions
  if (mockData.deadClicks) {
    prescriptions.push({
      type: "ux",
      title: "UX Confusion Identified",
      description:
        "Users are trying to click non-interactive elements, indicating unclear interface design.",
      action:
        "Make interactive elements clearly distinguishable or convert to actual links",
      impact: "Improves navigation flow and user satisfaction",
      cssSnippet: `/* Make it clearly clickable */
.element-selector {
  cursor: pointer;
  background: #007bff;
  color: white;
  border: 2px solid #007bff;
  border-radius: 6px;
  padding: 10px 20px;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.element-selector:hover {
  background: #0056b3;
  border-color: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,123,255,0.3);
}`,
    });
  }

  // Device-specific prescriptions
  if (mockData.deviceBreakdown.mobile < 10 && element.width < 150) {
    prescriptions.push({
      type: "mobile",
      title: "Mobile Optimization Required",
      description:
        "Poor mobile performance suggests the element is too small or hard to tap on touch devices.",
      action: "Increase touch target size and test on actual mobile devices",
      impact: "Boosts mobile conversion by 30-50%",
      cssSnippet: `/* Mobile-first responsive design */
.element-selector {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
  font-size: 16px;
  border-radius: 8px;
}

/* Larger touch targets on mobile */
@media (max-width: 768px) {
  .element-selector {
    min-width: 48px;
    min-height: 48px;
    padding: 14px 20px;
    font-size: 18px;
  }
}`,
    });
  }

  // Performance-based prescriptions
  if (element.percentage > 25) {
    prescriptions.push({
      type: "success",
      title: "High Performer - Scale This Success",
      description:
        "This element is performing exceptionally well. Consider applying similar design patterns elsewhere.",
      action:
        "Analyze what makes this element successful and replicate the pattern",
      impact: "Potential for 20-40% overall conversion improvement",
      cssSnippet: `/* Replicate successful styling */
.success-element {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  padding: 15px 30px;
  border-radius: 50px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
  transition: all 0.3s ease;
}

.success-element:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
}`,
    });
  }

  return prescriptions.length > 0
    ? prescriptions
    : [
        {
          type: "neutral",
          title: "Performing Within Normal Ranges",
          description:
            "This element shows typical engagement patterns for its type and position.",
          action:
            "Monitor performance and consider A/B testing for optimization opportunities",
          impact: "Stable performance with room for incremental improvements",
          cssSnippet: `/* Monitor and test variations */
.element-variant-a {
  /* Original styling */
}

.element-variant-b {
  /* Test variation - different color */
  background: #ff6b6b;
}

.element-variant-c {
  /* Test variation - different size */
  padding: 16px 32px;
  font-size: 18px;
}`,
        },
      ];
};
