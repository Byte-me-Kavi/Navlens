/**
 * ElementAnalysisModal Component
 *
 * Shows detailed analysis of clicked elements - Modern indigo theme
 * Uses Navlens AI for optimization insights (Pro tier and above)
 */

"use client";

import { useEffect, useState } from "react";
import { elementApi } from "../services/elementApi";
import type { ElementClick, ElementAnalysis } from "../types/element.types";
import { generatePrescription } from "./cssGenerator";
import { useSubscription } from "@/app/context/SubscriptionContext";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import {
  XMarkIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
  LightBulbIcon,
  SparklesIcon,
  ChartBarIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

interface ElementAnalysisModalProps {
  element: ElementClick;
  siteId: string;
  pagePath: string;
  deviceType: string;
  onClose: () => void;
}

interface AIInsight {
  title: string;
  description: string;
  action: string;
  impact: string;
  type: 'UX' | 'CRO' | 'CSS' | 'A11Y';
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
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { hasFeature, isLoading: subLoading } = useSubscription();
  const hasAIFeature = !subLoading && hasFeature('ai_assistant');

  // Fetch element analysis data
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
           desktop: deviceType === 'desktop' ? 100 : 0,
           tablet: deviceType === 'tablet' ? 100 : 0,
           mobile: deviceType === 'mobile' ? 100 : 0,
        };

        const analysisResult = {
          reality: {
            ctr,
            ctrTrend: (data.trends as { trends?: { clicks_change?: number } })?.trends?.clicks_change || 0,
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
              (data.trends as { trends?: { scroll_depth_change?: number } })?.trends?.scroll_depth_change || 0,
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
            ctrTrend: (data.trends as { trends?: { clicks_change?: number } })?.trends?.clicks_change || 0,
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
        };

        setAnalysis(analysisResult);

        // Fetch AI insights if user has Pro tier
        if (hasAIFeature) {
          fetchAIInsights(analysisResult, elementData);
        }
      } catch (error) {
        console.error("Error fetching analysis:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAIInsights is stable, including it would cause re-fetching
  }, [element, siteId, pagePath, deviceType, hasAIFeature]);

  // Fetch AI-generated insights
  const fetchAIInsights = async (analysisData: ElementAnalysis, elementData: Record<string, unknown> | undefined) => {
    try {
      setAiLoading(true);

      const context = {
        element: {
          tag: element.tag,
          selector: element.selector,
          text: element.text?.slice(0, 200),
          position: { x: Math.round(element.x), y: Math.round(element.y) },
          dimensions: { width: element.width || 0, height: element.height || 0 },
        },
        metrics: {
          clickCount: element.clickCount,
          percentage: element.percentage,
          ctr: analysisData.reality.ctr,
          scrollDepth: analysisData.reality.scrollDepth,
          position: analysisData.reality.position,
          rageClicks: elementData?.rage_click_sessions || 0,
          deadClicks: elementData?.dead_clicks || 0,
          deviceBreakdown: analysisData.reality.deviceBreakdown,
        },
        diagnosis: analysisData.diagnosis,
        page: pagePath,
        device: deviceType,
      };

      const response = await fetch('/api/ai/element-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      console.log('[AI Insights] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[AI Insights] Data received:', data);
        setAiInsights(data.insights || []);
      } else {
        const errorText = await response.text();
        console.error('[AI Insights] Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "Top Performer":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Good Performer":
        return "bg-sky-100 text-sky-700 border-sky-200";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'UX': return 'bg-violet-50 text-violet-600';
      case 'CRO': return 'bg-emerald-50 text-emerald-600';
      case 'CSS': return 'bg-sky-50 text-sky-600';
      case 'A11Y': return 'bg-amber-50 text-amber-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <CursorArrowRaysIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2">
                  Element Analysis
                  {analysis && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getRankColor(analysis.diagnosis.attractionRank)}`}>
                      {analysis.diagnosis.attractionRank}
                    </span>
                  )}
                </h3>
                <p className="text-indigo-400 text-sm mt-0.5 truncate max-w-md">
                  {element.selector}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-indigo-300 bg-indigo-100 rounded-xl transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
              <p className="text-gray-500 text-sm">Analyzing element...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium mb-1">
                    <ChartBarIcon className="w-4 h-4" />
                    {analysis.reality.ctrBenchmark === "Data Pending" ? "Click Share" : "Click Rate"}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.reality.ctrBenchmark === "Data Pending" 
                      ? `${element.percentage.toFixed(1)}%` 
                      : `${analysis.reality.ctr.toFixed(1)}%`}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                    {analysis.reality.ctrBenchmark === "Above Average" ? (
                      <>
                        <ArrowTrendingUpIcon className="w-3 h-3" />
                        Above average
                      </>
                    ) : analysis.reality.ctrBenchmark === "Data Pending" ? (
                      "Relative to page"
                    ) : (
                      "Below average"
                    )}
                  </div>
                </div>

                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                  <div className="text-sm text-violet-600 font-medium mb-1">Scroll Depth</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.reality.scrollDepth.toFixed(0)}%
                  </div>
                  <div className="text-xs text-violet-600 mt-1">
                    {analysis.reality.position}
                  </div>
                </div>

                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <div className="flex items-center gap-1 text-sm text-rose-600 font-medium mb-1">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Rage Clicks
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.diagnosis.frustrationExplanation.split(' ')[0]}
                  </div>
                  <div className="text-xs text-rose-600 mt-1">
                    {analysis.diagnosis.frustrationIndex === "High" ? "High frustration" : "Normal"}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-600 font-medium mb-1">Total Clicks</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {element.clickCount?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Raw count
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Technical Details */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CodeBracketIcon className="w-5 h-5 text-gray-400" />
                    Technical Details
                  </h4>
                  <div className="space-y-3 text-sm">
                     <div className="flex justify-between py-2 border-b border-gray-100">
                       <span className="text-gray-500">HTML Tag</span>
                       <span className="font-mono text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">{element.tag.toLowerCase()}</span>
                     </div>
                     <div className="flex justify-between py-2 border-b border-gray-100">
                       <span className="text-gray-500">Dimensions</span>
                       <span className="font-mono text-gray-700">{Math.round(element.width || 0)} × {Math.round(element.height || 0)}px</span>
                     </div>
                     <div className="flex justify-between py-2 border-b border-gray-100">
                       <span className="text-gray-500">Position</span>
                       <span className="font-mono text-gray-700">{Math.round(element.x)}, {Math.round(element.y)}</span>
                     </div>
                     <div>
                       <span className="text-gray-500 block mb-2">Text Content</span>
                       <p className="font-mono text-xs bg-gray-50 p-2.5 rounded-lg text-gray-600 break-words max-h-20 overflow-y-auto border border-gray-100">
                         {element.text || "<No text content>"}
                       </p>
                     </div>
                  </div>
                </div>

                {/* AI Insights - Pro Tier Feature */}
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 relative overflow-hidden">
                  <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                      <SparklesIcon className="w-4 h-4 text-indigo-600" />
                    </div>
                    AI Insights
                    {hasAIFeature && (
                      <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">Pro</span>
                    )}
                  </h4>
                  
                  {/* Pro tier check */}
                  {!hasAIFeature ? (
                    <div className="text-center py-6">
                      <div className="inline-flex items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
                        <LockClosedIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-2">Unlock AI Element Insights</h5>
                      <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">
                        Get personalized CSS, UX, and conversion recommendations powered by AI.
                      </p>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  ) : aiLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                      <span className="ml-3 text-sm text-gray-500">Generating AI insights...</span>
                    </div>
                  ) : aiInsights.length > 0 ? (
                    <div className="space-y-3">
                      {aiInsights.slice(0, 3).map((insight, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-semibold text-gray-900 text-sm">{insight.title}</h5>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${getTypeColor(insight.type)}`}>
                              {insight.type}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">{insight.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
                              → {insight.action}
                            </span>
                            {insight.impact && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-medium border border-emerald-100">
                                <LightBulbIcon className="w-3 h-3" />
                                {insight.impact}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Fallback to static prescriptions
                    <div className="space-y-3">
                      {Array.isArray(analysis.prescription) && analysis.prescription.length > 0 ? (
                        analysis.prescription.slice(0, 2).map((rx, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-semibold text-gray-900 text-sm">{rx.title}</h5>
                              <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{rx.type}</span>
                            </div>
                            <p className="text-gray-600 text-xs mt-1.5 leading-relaxed">{rx.description}</p>
                            {rx.impact && (
                              <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-medium border border-emerald-100">
                                <LightBulbIcon className="w-3 h-3" />
                                {rx.impact}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm italic bg-white p-4 rounded-xl border border-gray-100">
                          No specific recommendations available for this element.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {analysis.diagnosis.confusionIndex === "High" && (
                    <div className="mt-4 flex items-start gap-2 bg-rose-50 p-3 rounded-xl border border-rose-200">
                      <ExclamationTriangleIcon className="w-5 h-5 text-rose-500 flex-shrink-0" />
                      <div className="text-xs text-rose-800">
                        <strong>Dead Clicks Detected:</strong> Users are clicking this non-interactive element. Consider making it clickable or changing its design.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p>Failed to load analysis for this element.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        planName="Pro"
        featureName="AI Element Insights"
      />
    </div>
  );
}
