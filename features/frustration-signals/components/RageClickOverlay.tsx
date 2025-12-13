"use client";

import React, { useMemo } from "react";
import { FiAlertTriangle } from "react-icons/fi";

export interface RageClickPoint {
  x: number;
  y: number;
  count: number;
  elementSelector: string;
  frustrationScore: number;
}

interface RageClickOverlayProps {
  rageClicks: RageClickPoint[];
  containerWidth: number;
  containerHeight: number;
  documentWidth: number;
  documentHeight: number;
  onClickPoint?: (point: RageClickPoint) => void;
}

export function RageClickOverlay({
  rageClicks,
  containerWidth,
  containerHeight,
  documentWidth,
  documentHeight,
  onClickPoint,
}: RageClickOverlayProps) {
  // Calculate scaling factors
  const scaleX = containerWidth / documentWidth;
  const scaleY = containerHeight / documentHeight;

  // Group and aggregate rage clicks by position (cluster nearby clicks)
  const clusteredClicks = useMemo(() => {
    if (!rageClicks.length) return [];

    const CLUSTER_RADIUS = 50; // pixels
    const clusters: RageClickPoint[] = [];

    for (const click of rageClicks) {
      // Find existing cluster within radius
      const existingCluster = clusters.find(
        (c) =>
          Math.abs(c.x - click.x) < CLUSTER_RADIUS &&
          Math.abs(c.y - click.y) < CLUSTER_RADIUS
      );

      if (existingCluster) {
        // Merge into existing cluster
        existingCluster.count += click.count;
        existingCluster.frustrationScore = Math.max(
          existingCluster.frustrationScore,
          click.frustrationScore
        );
      } else {
        // Create new cluster
        clusters.push({ ...click });
      }
    }

    return clusters;
  }, [rageClicks]);

  // Get intensity color based on frustration score
  const getIntensityColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-amber-400";
  };

  // Get size based on click count
  const getSize = (count: number) => {
    if (count >= 10) return 48;
    if (count >= 5) return 36;
    if (count >= 3) return 28;
    return 24;
  };

  if (clusteredClicks.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 pointer-events-auto">
        <div className="text-xs text-white font-semibold mb-2 flex items-center gap-1.5">
          <FiAlertTriangle className="w-4 h-4 text-red-400" />
          Rage Click Hotspots
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-300">Critical (80+)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-300">High (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-300">Medium (40-59)</span>
          </div>
        </div>
      </div>

      {/* Rage Click Markers */}
      {clusteredClicks.map((click, index) => {
        const size = getSize(click.count);
        const color = getIntensityColor(click.frustrationScore);
        const scaledX = click.x * scaleX;
        const scaledY = click.y * scaleY;

        return (
          <div
            key={index}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{
              left: scaledX - size / 2,
              top: scaledY - size / 2,
              width: size,
              height: size,
            }}
            onClick={() => onClickPoint?.(click)}
          >
            {/* Pulse animation ring */}
            <div
              className={`absolute inset-0 rounded-full ${color} opacity-30 animate-ping`}
              style={{ animationDuration: "2s" }}
            />
            
            {/* Main marker */}
            <div
              className={`absolute inset-0 rounded-full ${color} opacity-80 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}
            >
              <span className="text-white text-xs font-bold">
                {click.count}
              </span>
            </div>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl">
                <div className="font-semibold">{click.count} rage clicks</div>
                <div className="text-gray-400 mt-1">
                  Frustration: {click.frustrationScore}%
                </div>
                <div className="text-gray-400 truncate max-w-48">
                  {click.elementSelector}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary Badge */}
      <div className="absolute bottom-4 left-4 bg-red-600/90 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-auto">
        <div className="text-white text-sm font-semibold">
          {clusteredClicks.reduce((sum, c) => sum + c.count, 0)} Total Rage
          Clicks
        </div>
        <div className="text-red-200 text-xs">
          {clusteredClicks.length} hotspot{clusteredClicks.length !== 1 ? "s" : ""} detected
        </div>
      </div>
    </div>
  );
}
