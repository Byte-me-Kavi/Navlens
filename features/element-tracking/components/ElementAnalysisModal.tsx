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

        const deviceBreakdown = {
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
        };

        setAnalysis({
          reality: {
            ctr,
            ctrTrend: (data.trends as any)?.trends?.clicks_change || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            ctrBenchmark:
              ctr > (siteAvg?.avg_ctr_by_tag || 1)
                ? "Above Average"
                : ctr > (siteAvg?.avg_ctr_by_tag || 1) * 0.5
                ? "Average"
                : "Below Average",
            deviceBreakdown,
            scrollDepth:
              elementData?.avg_scroll_depth ||
              (element.y / window.innerHeight) * 100,
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
          prescription: generatePrescription(element, {
            ctr,
            ctrTrend: (data.trends as any)?.trends?.clicks_change || 0, // eslint-disable-line @typescript-eslint/no-explicit-any
            deviceBreakdown,
            scrollDepth:
              elementData?.avg_scroll_depth ||
              (element.y / window.innerHeight) * 100,
            scrollDepthTrend: 0,
            isImportant: element.tag === "BUTTON",
            rageClicks: elementData?.rage_click_sessions || 0,
            deadClicks: elementData?.dead_clicks || 0,
            siteAvgCTR: siteAvg?.avg_ctr_by_tag || 0.5,
          }),
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
      className="fixed inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-100"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Element Analysis
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Performance Badge */}
              <div className="text-center">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    element.percentage > 20
                      ? "bg-green-100 text-green-800"
                      : element.percentage > 10
                      ? "bg-blue-100 text-blue-800"
                      : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {analysis.diagnosis.attractionRank}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis.reality.ctr.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Click-Through Rate
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.reality.scrollDepth.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Scroll Depth</div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-blue-50 p-4 rounded">
                <h4 className="font-semibold mb-2">Element Info</h4>
                <p className="text-sm text-gray-700">
                  <strong>Tag:</strong> {element.tag}
                  <br />
                  <strong>Text:</strong> {element.text}
                  <br />
                  <strong>Clicks:</strong> {element.clickCount} (
                  {element.percentage.toFixed(1)}%)
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              Failed to load analysis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
