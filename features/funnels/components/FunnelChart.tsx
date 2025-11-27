/**
 * FunnelChart Component
 *
 * Visualizes funnel conversion data as a horizontal bar chart
 */

"use client";

import React from "react";
import { FunnelStepResult } from "../types/funnel.types";

interface FunnelChartProps {
  steps: FunnelStepResult[];
  totalSessions: number;
  className?: string;
}

export function FunnelChart({
  steps,
  totalSessions,
  className = "",
}: FunnelChartProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">No funnel data available</p>
      </div>
    );
  }

  const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);
  const maxVisitors = sortedSteps[0]?.visitors || 1;

  return (
    <div className={`space-y-4 ${className}`}>
      {sortedSteps.map((step, index) => {
        const widthPercentage = Math.max(
          (step.visitors / maxVisitors) * 100,
          5
        );
        const isFirst = index === 0;
        const isLast = index === sortedSteps.length - 1;
        const prevVisitors =
          index > 0 ? sortedSteps[index - 1].visitors : step.visitors;
        const dropoff = prevVisitors - step.visitors;

        // Color gradient from blue to green
        const colors = [
          "from-blue-500 to-blue-600",
          "from-blue-400 to-cyan-500",
          "from-cyan-400 to-teal-500",
          "from-teal-400 to-emerald-500",
          "from-emerald-400 to-green-500",
        ];
        const colorClass = colors[Math.min(index, colors.length - 1)];

        return (
          <div key={step.step_id} className="relative">
            {/* Step label and stats */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {step.order_index + 1}
                </span>
                <span className="font-medium text-gray-900">
                  {step.step_name}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-gray-900">
                  {step.visitors.toLocaleString()} users
                </span>
                {!isFirst && (
                  <span
                    className={`font-medium ${
                      100 - step.drop_off_rate >= 50
                        ? "text-green-600"
                        : 100 - step.drop_off_rate >= 25
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {(100 - step.drop_off_rate).toFixed(1)}% conversion
                  </span>
                )}
              </div>
            </div>

            {/* Bar visualization */}
            <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-linear-to-r ${colorClass} rounded-lg transition-all duration-500 ease-out`}
                style={{ width: `${widthPercentage}%` }}
              >
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <span className="text-white font-bold text-sm drop-shadow-sm">
                    {step.conversion_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Dropoff indicator */}
            {!isFirst && dropoff > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                <span>
                  {dropoff.toLocaleString()} dropped (
                  {step.drop_off_rate.toFixed(1)}%)
                </span>
              </div>
            )}

            {/* Connection line to next step */}
            {!isLast && (
              <div className="flex justify-center py-2">
                <svg
                  className="w-4 h-6 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {sortedSteps[0]?.visitors.toLocaleString() || 0}
            </p>
            <p className="text-xs text-gray-500">Started</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {sortedSteps[sortedSteps.length - 1]?.visitors.toLocaleString() ||
                0}
            </p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {sortedSteps[sortedSteps.length - 1]?.conversion_rate.toFixed(
                1
              ) || 0}
              %
            </p>
            <p className="text-xs text-gray-500">Conversion Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
