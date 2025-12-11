/**
 * CursorPathsOverlay Component
 * 
 * Renders cursor movement patterns as SVG path lines
 * Shows session behavior patterns (focused, exploring, lost, minimal)
 */

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { CursorPathsData, SessionPath } from "../hooks/useCursorPathsData";

interface CursorPathsOverlayProps {
  data: CursorPathsData | null;
  width: number;
  height: number;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

// Colors for different behavior patterns
const patternColors: Record<SessionPath["pattern"], string> = {
  focused: "#22c55e",    // green - smooth, direct movement
  exploring: "#3b82f6",  // blue - curious browsing
  lost: "#ef4444",       // red - erratic, frustrated
  minimal: "#9ca3af",    // gray - little movement
};

// Simple seeded random for consistent path generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Generate mock path points for visualization (deterministic based on sessionId)
// In production, these would come from actual cursor tracking data
function generateMockPathPoints(
  session: SessionPath,
  width: number,
  height: number
): { x: number; y: number }[] {
  // Create a seeded random based on session ID for consistent paths
  const seedNum = session.sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seedNum);
  
  const points: { x: number; y: number }[] = [];
  const numPoints = Math.min(session.pathSegments, 20);
  
  // Use session characteristics to influence path shape
  const erraticness = session.pattern === "lost" ? 0.3 : 0.1;
  
  // Starting position (deterministic)
  let x = random() * (width * 0.8) + width * 0.1;
  let y = random() * (height * 0.3);
  points.push({ x, y });
  
  // Generate path based on pattern
  for (let i = 1; i < numPoints; i++) {
    const progress = i / numPoints;
    
    if (session.pattern === "focused") {
      // Smooth downward movement with slight horizontal variance
      x += (random() - 0.5) * 50;
      y += height / numPoints + (random() - 0.5) * 20;
    } else if (session.pattern === "exploring") {
      // Wide horizontal movement, slower vertical
      x += (random() - 0.5) * 150;
      y += height / (numPoints * 1.5) + (random() - 0.5) * 30;
    } else if (session.pattern === "lost") {
      // Erratic movement with backtracking
      x += (random() - 0.5) * 200;
      y += (random() - 0.3) * 80;
    } else {
      // Minimal - small movements
      x += (random() - 0.5) * 30;
      y += height / (numPoints * 2);
    }
    
    // Keep within bounds
    x = Math.max(20, Math.min(width - 20, x));
    y = Math.max(20, Math.min(height - 20, y));
    
    points.push({ x, y });
  }
  
  return points;
}

// Create smooth SVG path from points
function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    const cpY = (prev.y + curr.y) / 2;
    path += ` Q ${prev.x} ${prev.y} ${cpX} ${cpY}`;
  }
  
  // End at last point
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  
  return path;
}

export function CursorPathsOverlay({
  data,
  width,
  height,
  iframeRef,
}: CursorPathsOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Sync scroll position with iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    
    const handleScroll = () => {
      const scrollTop = iframe.contentDocument?.documentElement?.scrollTop || 
                        iframe.contentWindow?.scrollY || 0;
      setScrollOffset(scrollTop);
    };
    
    iframe.contentWindow.addEventListener("scroll", handleScroll);
    return () => {
      iframe.contentWindow?.removeEventListener("scroll", handleScroll);
    };
  }, [iframeRef]);
  
  if (!data || data.sessions.length === 0) {
    return (
      <div
        id="cursor-paths-overlay"
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{ zIndex: 60 }}
      >
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center max-w-sm">
          <div className="text-amber-600 text-2xl mb-2">🖱️</div>
          <p className="text-amber-800 font-medium">No Cursor Path Data</p>
          <p className="text-amber-600 text-sm mt-1">
            {data?.note || "Cursor tracking data not available for this page"}
          </p>
        </div>
      </div>
    );
  }
  // Memoize path generation to prevent re-computation on scroll
  const sessionsWithPaths = useMemo(() => {
    if (!data?.sessions) return [];
    // Take top 10 sessions for visualization
    return data.sessions.slice(0, 10).map(session => ({
      session,
      points: generateMockPathPoints(session, width, height),
      color: patternColors[session.pattern],
      pathD: '',  // Will be computed below
    }));
  }, [data?.sessions, width, height]);
  
  // Pre-compute path strings
  const sessionsToRender = useMemo(() => {
    return sessionsWithPaths.map(item => ({
      ...item,
      pathD: createSmoothPath(item.points),
    }));
  }, [sessionsWithPaths]);
  
  return (
    <div
      ref={containerRef}
      id="cursor-paths-overlay"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 60 }}
    >
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Session Patterns</h4>
        <div className="space-y-1">
          {Object.entries(patternColors).map(([pattern, color]) => (
            <div key={pattern} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600 capitalize">{pattern}</span>
              <span className="text-xs text-gray-400">
                ({data.patternBreakdown[pattern as SessionPath["pattern"]] || 0})
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Showing {sessionsToRender.length} of {data.totalSessions} sessions
          </p>
        </div>
      </div>
      
      {/* Stats panel */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-500">Total Sessions</p>
            <p className="font-bold text-gray-800">{data.totalSessions}</p>
          </div>
          <div>
            <p className="text-gray-500">Erratic %</p>
            <p className="font-bold text-red-600">{data.erraticPercentage}%</p>
          </div>
          <div>
            <p className="text-gray-500">Avg Distance</p>
            <p className="font-bold text-gray-800">{data.avgDistance}px</p>
          </div>
          <div>
            <p className="text-gray-500">Dir. Changes</p>
            <p className="font-bold text-gray-800">{data.avgDirectionChanges}</p>
          </div>
        </div>
      </div>
      
      {/* SVG paths */}
      <svg
        width={width}
        height={height}
        className="absolute top-0 left-0"
        style={{ transform: `translateY(-${scrollOffset}px)` }}
      >
        <defs>
          {/* Arrow marker for path direction */}
          {Object.entries(patternColors).map(([pattern, color]) => (
            <marker
              key={pattern}
              id={`arrow-${pattern}`}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill={color} opacity="0.6" />
            </marker>
          ))}
        </defs>
        
        {sessionsToRender.map((item, index) => {
          const { session, points, pathD, color } = item;
          
          return (
            <g key={session.sessionId || index}>
              {/* Path shadow */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Main path */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
                markerEnd={`url(#arrow-${session.pattern})`}
                className="transition-opacity hover:opacity-100"
              />
              {/* Start point */}
              <circle
                cx={points[0]?.x || 0}
                cy={points[0]?.y || 0}
                r="6"
                fill={color}
                stroke="white"
                strokeWidth="2"
                opacity="0.8"
              />
              {/* End point */}
              <circle
                cx={points[points.length - 1]?.x || 0}
                cy={points[points.length - 1]?.y || 0}
                r="4"
                fill="white"
                stroke={color}
                strokeWidth="2"
                opacity="0.8"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
