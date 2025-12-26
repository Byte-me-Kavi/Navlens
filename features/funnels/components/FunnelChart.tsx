/**
 * FunnelChart Component
 *
 * Visualizes funnel conversion data as a horizontal bar chart
 */

"use client";

import React from "react";

import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";


import { useRef } from "react";
import { FunnelStepResult } from "../types/funnel.types";

interface FunnelChartProps {
  steps: FunnelStepResult[];
  totalSessions: number;
  className?: string;
}

const COLORS = [
  "#4f46e5", // Indigo 600
  "#7c3aed", // Violet 600
  "#db2777", // Pink 600
  "#ea580c", // Orange 600
  "#059669", // Emerald 600
  "#2563eb", // Blue 600
  "#d97706", // Amber 600
];

// Tooltip interface for type safety
interface FunnelTooltipPayloadItem {
  payload: {
    name: string;
    value: number;
    conversion: number;
    visitors: number;
    fill: string;
  };
}

interface FunnelTooltipProps {
  active?: boolean;
  payload?: FunnelTooltipPayloadItem[];
}

// Custom tooltip - defined outside component to avoid creating during render
function FunnelCustomTooltip({ active, payload }: FunnelTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = data.fill;
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl">
        <p className="font-bold text-gray-900 mb-1 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
          {data.name}
        </p>
        <div className="space-y-1 text-sm">
          <p className="text-gray-600">
            Visitors: <span className="font-semibold text-gray-900">{data.visitors.toLocaleString()}</span>
          </p>
          <p className="text-gray-600">
            Conversion: <span className="font-semibold text-indigo-600">{data.conversion.toFixed(1)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function FunnelChart({
  steps,
  totalSessions: _totalSessions,
  className = "",
}: FunnelChartProps) {

  const chartRef = useRef<HTMLDivElement>(null);

  if (!steps || steps.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 ${className}`}>
        <p className="text-gray-500">No funnel data available</p>
      </div>
    );
  }

  const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);

  const data = sortedSteps.map((step, _index) => ({
    name: step.step_name,
    value: step.visitors,
    conversion: step.conversion_rate,
    dropOff: 100 - step.drop_off_rate,
    visitors: step.visitors,
    originalStep: step,
  }));

  // Calculate stats for summary
  const startCount = sortedSteps[0]?.visitors || 0;
  const endCount = sortedSteps[sortedSteps.length - 1]?.visitors || 0;
  const overallRate =
    startCount > 0 ? ((endCount / startCount) * 100).toFixed(1) : "0.0";
  




  return (
    <div className={`space-y-8 ${className}`}>
        <div className="flex justify-end">

        </div>
      <div 
        ref={chartRef}
        className="h-[400px] w-full bg-gray-50/30 rounded-2xl border border-gray-100/50 p-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsFunnelChart>
            <Tooltip content={<FunnelCustomTooltip />} cursor={{ fill: "transparent" }} />
            <Funnel
              dataKey="value"
              data={data}
              isAnimationActive={false}
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList
                position="right"
                fill="#4b5563"
                stroke="none"
                dataKey="name"
                style={{ fontSize: '14px', fontWeight: 500 }}
              />
               <LabelList
                position="center"
                fill="#ffffff"
                stroke="none"
                dataKey="value"
                formatter={
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (val: any) => typeof val === 'number' ? val.toLocaleString() : (typeof val === 'string' ? val : '')
                }
                style={{ fontSize: '14px', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
              />
            </Funnel>
          </RechartsFunnelChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="border-t border-gray-100 pt-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:shadow-md hover:border-indigo-100">
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {startCount.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</p>
          </div>
          <div className="text-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 transition-all hover:shadow-md hover:border-emerald-200">
            <p className="text-3xl font-bold text-emerald-600 mb-1">
              {endCount.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider">Completed</p>
          </div>
          <div className="text-center p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 transition-all hover:shadow-md hover:border-indigo-200">
            <p className="text-3xl font-bold text-indigo-600 mb-1">
              {overallRate}%
            </p>
            <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wider">Overall Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
