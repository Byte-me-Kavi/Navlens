/**
 * FunnelCard Component
 *
 * Displays a funnel summary with quick stats
 */

"use client";

import React from "react";
import { FunnelWithStats } from "../types/funnel.types";
import {
  FunnelIcon,
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface FunnelCardProps {
  funnel: FunnelWithStats;
  onView: (funnelId: string) => void;
  onDelete: (funnelId: string) => void;
}

export function FunnelCard({ funnel, onView, onDelete }: FunnelCardProps) {
  const completionRate = funnel.lastAnalysis?.overall_conversion_rate ?? 0;
  const totalSessions = funnel.lastAnalysis?.total_sessions ?? 0;
  const lastAnalyzed = funnel.lastAnalysis?.analyzed_at;

  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <FunnelIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{funnel.name}</h3>
            {funnel.description && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {funnel.description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this funnel?")) {
              onDelete(funnel.id);
            }
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Delete funnel"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Steps preview */}
      <div className="mb-4">
        <div className="flex items-center gap-1 text-xs text-gray-500 overflow-hidden">
          {funnel.steps.slice(0, 4).map((step, index) => (
            <React.Fragment key={step.id || index}>
              <span
                className="bg-gray-100 px-2 py-0.5 rounded truncate max-w-[100px]"
                title={step.name}
              >
                {step.name}
              </span>
              {index < Math.min(funnel.steps.length - 1, 3) && (
                <ArrowRightIcon className="w-3 h-3 shrink-0" />
              )}
            </React.Fragment>
          ))}
          {funnel.steps.length > 4 && (
            <span className="text-gray-400">+{funnel.steps.length - 4}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">
            {funnel.steps.length}
          </p>
          <p className="text-xs text-gray-500">Steps</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p
            className={`text-lg font-bold ${
              completionRate >= 20
                ? "text-green-600"
                : completionRate >= 10
                ? "text-yellow-600"
                : "text-gray-900"
            }`}
          >
            {completionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Conversion</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">
            {totalSessions.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>
            {lastAnalyzed
              ? `Analyzed ${new Date(lastAnalyzed).toLocaleDateString()}`
              : "Not analyzed yet"}
          </span>
        </div>
        <button
          onClick={() => onView(funnel.id)}
          className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold hover:text-blue-700 group-hover:translate-x-1 transition-all"
        >
          <ChartBarIcon className="w-4 h-4" />
          <span>View Analysis</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
