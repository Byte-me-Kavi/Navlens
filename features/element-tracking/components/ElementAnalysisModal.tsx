/**
 * ElementAnalysisModal Component
 *
 * Shows detailed analysis of clicked elements
 */

"use client";

import { useEffect, useState } from "react";
import { elementApi } from "../services/elementApi";
import type { ElementClick, ElementAnalysis } from "../types/element.types";
import { generatePrescription } from "./cssGenerator";

interface ElementAnalysisModalProps {
  element: ElementClick;
  siteId: string;
  pagePath: string;
  deviceType: string;
  onClose: () => void;
}

export function ElementAnalysisModal({
  element,
  siteId,
  pagePath,
  deviceType,
  onClose,
}: ElementAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<ElementAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);

        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        const data = await elementApi.getElementMetrics({
          siteId,
          pagePath,
          deviceType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          elementSelector: element.selector,
        });

        // Process data and generate analysis
        const elementData = (
          data.elementMetrics as Array<{
            element_selector: string;
            total_clicks: number;
            unique_sessions: number;
            avg_scroll_depth: number;
            desktop_clicks: number;
            tablet_clicks: number;
            mobile_clicks: number;
            rage_click_sessions: number;
            dead_clicks: number;
          }>
        )?.find((el) => el.element_selector === element.selector);

        const siteAvg = (
          data.siteAverages?.averages as Array<{
            element_tag: string;
            avg_ctr_by_tag: number;
            element_count: number;
          }>
        )?.find((avg) => avg.element_tag === element.tag);

        const ctr = elementData
          ? (elementData.total_clicks /
              Math.max(elementData.unique_sessions, 1)) *
            100
          : 0;

        const hasDeviceData = (elementData?.total_clicks || 0) > 0;

        const deviceBreakdown = hasDeviceData ? {
          desktop:
            ((elementData?.desktop_clicks || 0) /
              (elementData?.total_clicks || 1)) *
            100,
          tablet:
            ((elementData?.tablet_clicks || 0) /
              (elementData?.total_clicks || 1)) *
            100,
          mobile:
            ((elementData?.mobile_clicks || 0) /
              (elementData?.total_clicks || 1)) *
            100,
        } : {
           // Fallback: Assume current device type accounts for observed clicks if no historical data
           desktop: deviceType === 'desktop' ? 100 : 0,
           tablet: deviceType === 'tablet' ? 100 : 0,
           mobile: deviceType === 'mobile' ? 100 : 0,
        };

        setAnalysis({
          reality: {
            ctr,
            ctrTrend: (data.trends as any)?.trends?.clicks_change || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            ctrBenchmark: !elementData 
                ? "Data Pending" 
                : ctr > (siteAvg?.avg_ctr_by_tag || 1)
                ? "Above Average"
                : ctr > (siteAvg?.avg_ctr_by_tag || 1) * 0.5
                ? "Average"
                : "Below Average",
            deviceBreakdown,
            scrollDepth:
              elementData?.avg_scroll_depth ||
              Math.min(100, (element.y / (element.document_height || document.documentElement.scrollHeight || window.innerHeight)) * 100),
            scrollDepthTrend:
              (data.trends as any)?.trends?.scroll_depth_change || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            position:
              element.y < 200
                ? "Hero Section"
                : element.y > window.innerHeight * 0.8
                ? "Below Fold"
                : "Mid-Page",
            siteAvgCTR: siteAvg?.avg_ctr_by_tag || 0.5,
          },
          diagnosis: {
            frustrationIndex:
              (elementData?.rage_click_sessions || 0) > 3 ? "High" : "Low",
            frustrationExplanation: `${
              elementData?.rage_click_sessions || 0
            } rapid click sessions`,
            confusionIndex:
              (elementData?.dead_clicks || 0) > 0 ? "High" : "Low",
            confusionExplanation: `${
              elementData?.dead_clicks || 0
            } clicks on non-interactive elements`,
            hesitationScore:
              element.percentage < 5
                ? "High"
                : element.percentage > 15
                ? "Low"
                : "Medium",
            hesitationExplanation: "Based on click-through rate",
            attractionRank:
              element.percentage > 20
                ? "Top Performer"
                : element.percentage > 10
                ? "Good Performer"
                : "Needs Attention",
          },
          prescription: elementData ? generatePrescription(element, {
            ctr,
            ctrTrend: (data.trends as any)?.trends?.clicks_change || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            deviceBreakdown,
            scrollDepth:
              elementData?.avg_scroll_depth ||
              Math.min(100, (element.y / (element.document_height || document.documentElement.scrollHeight || window.innerHeight)) * 100),
            scrollDepthTrend: 0,
            isImportant: element.tag === "BUTTON",
            rageClicks: elementData?.rage_click_sessions || 0,
            deadClicks: elementData?.dead_clicks || 0,
            siteAvgCTR: siteAvg?.avg_ctr_by_tag || 0.5,
          }) : [],
        });
      } catch (error) {
        console.error("Error fetching analysis:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [element, siteId, pagePath, deviceType]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[2100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Element Analysis
                {analysis && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      analysis.diagnosis.attractionRank === "Top Performer"
                        ? "bg-green-100 text-green-800"
                        : analysis.diagnosis.attractionRank.includes("Good")
                        ? "bg-blue-100 text-blue-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {analysis.diagnosis.attractionRank}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Selector: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{element.selector}</code>
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-gray-500 text-sm">Crunching numbers...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-8">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="text-sm text-blue-600 font-medium mb-1">
                    {analysis.reality.ctrBenchmark === "Data Pending" ? "Click Share" : "Click Rate"}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.reality.ctrBenchmark === "Data Pending" 
                      ? `${element.percentage.toFixed(1)}%` 
                      : `${analysis.reality.ctr.toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                    {analysis.reality.ctrBenchmark === "Above Average" ? "↑ Above avg" :
                     analysis.reality.ctrBenchmark === "Data Pending" ? "Relative to page" :
                     "↓ Below avg"}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div className="text-sm text-purple-600 font-medium mb-1">Scroll Depth</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.reality.scrollDepth.toFixed(1)}%
                  </div>
                  <div className="text-xs text-purple-700 mt-1">
                    {analysis.reality.position}
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div className="text-sm text-orange-600 font-medium mb-1">Rage Clicks</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.diagnosis.frustrationExplanation.split(' ')[0]}
                  </div>
                  <div className="text-xs text-orange-700 mt-1">
                    {analysis.diagnosis.frustrationIndex === "High" ? "⚠️ High Frustration" : "Normal"}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="text-sm text-gray-600 font-medium mb-1">Total Clicks</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {element.clickCount}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Raw click count
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Technical Details */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Technical Details
                  </h4>
                  <div className="space-y-3 text-sm">
                     <div className="flex justify-between border-b border-gray-50 pb-2">
                       <span className="text-gray-500">HTML Tag</span>
                       <span className="font-mono text-gray-700 font-medium">{element.tag.toLowerCase()}</span>
                     </div>
                     <div className="flex justify-between border-b border-gray-50 pb-2">
                       <span className="text-gray-500">Dimensions</span>
                       <span className="font-mono text-gray-700">{Math.round(element.width || 0)} × {Math.round(element.height || 0)} px</span>
                     </div>
                     <div className="flex justify-between border-b border-gray-50 pb-2">
                       <span className="text-gray-500">Position</span>
                       <span className="font-mono text-gray-700">X: {Math.round(element.x)}, Y: {Math.round(element.y)}</span>
                     </div>
                     <div className="flex justify-between border-b border-gray-50 pb-2">
                       <span className="text-gray-500">Selector Quality</span>
                       <span className="text-green-600 font-medium">Specific</span>
                     </div>
                     <div>
                       <span className="text-gray-500 block mb-1">Full Text Content</span>
                       <p className="font-mono text-xs bg-gray-50 p-2 rounded text-gray-600 break-words max-h-20 overflow-y-auto">
                         {element.text || "<No text content>"}
                       </p>
                     </div>
                  </div>
                </div>

                {/* AI Prescription */}
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M9.663 17h4.673M12 3v1m6.364 1.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">AI</span>
                    Optimization Insight
                  </h4>
                  
                  <div className="relative z-10 space-y-3">
                    {Array.isArray(analysis.prescription) && analysis.prescription.length > 0 ? (
                      analysis.prescription.map((rx, idx) => (
                        <div key={idx} className="bg-white/80 p-3 rounded-lg border border-indigo-50 shadow-sm">
                          <h5 className="font-semibold text-indigo-900 text-sm flex justify-between">
                            {rx.title}
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold border border-indigo-100 px-1 rounded">{rx.type}</span>
                          </h5>
                          <p className="text-gray-700 text-sm mt-1">{rx.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                             <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium">
                               To Do: {rx.action}
                             </span>
                             {rx.impact && (
                               <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium border border-green-100">
                                 Impact: {rx.impact}
                               </span>
                             )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm italic">No specific recommendations available for this element.</p>
                    )}
                  </div>
                  
                  {analysis.diagnosis.confusionIndex === "High" && (
                    <div className="mt-4 flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-100 relative z-10">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-xs text-red-800">
                        <strong>Dead Clicks Detected:</strong> Users are trying to click this non-interactive element. Consider making it clickable or changing its design.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p>Failed to load analysis for this element.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
