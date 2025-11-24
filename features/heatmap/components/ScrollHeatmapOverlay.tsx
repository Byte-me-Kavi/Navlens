"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";

interface ScrollDataPoint {
  scroll_percentage: number;
  sessions: number;
}

interface ScrollHeatmapOverlayProps {
  scrollData: ScrollDataPoint[];
  totalSessions: number; // We will use this only as a fallback
  height: number;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onOverlaysRendered?: () => void;
}

export function ScrollHeatmapOverlay({
  scrollData,
  height,
  iframeRef,
  onOverlaysRendered,
}: ScrollHeatmapOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [hoveredPercentage, setHoveredPercentage] = useState<number | null>(
    null
  );
  const [isOverlayHovered, setIsOverlayHovered] = useState(false);
  const iframeScrollTopRef = useRef(0);

  useEffect(() => {
    if (onOverlaysRendered) onOverlaysRendered();
  }, [onOverlaysRendered]);

  // Sync overlay position with iframe scroll
  useEffect(() => {
    if (!iframeRef?.current?.contentWindow) return;

    let animationFrameId: number;
    let lastScrollTop = 0;

    const handleIframeScroll = () => {
      if (animationFrameId) return; // Prevent multiple frames

      animationFrameId = requestAnimationFrame(() => {
        const scrollTop = iframeRef.current?.contentWindow?.scrollY || 0;

        // Only update if scroll position actually changed
        if (scrollTop !== lastScrollTop) {
          iframeScrollTopRef.current = scrollTop;
          lastScrollTop = scrollTop;
        }

        animationFrameId = 0;
      });
    };

    const iframeWindow = iframeRef.current.contentWindow;
    iframeWindow.addEventListener("scroll", handleIframeScroll, {
      passive: true,
    });

    // Initial sync
    handleIframeScroll();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      iframeWindow.removeEventListener("scroll", handleIframeScroll);
    };
  }, [iframeRef]);

  // --- 1. Clean Data & Determine "Real" Total ---
  const { cleanData, maxSessions, shouldRender } = useMemo(() => {
    if (!scrollData || scrollData.length === 0) {
      return { cleanData: [], maxSessions: 0, shouldRender: false };
    }

    // Sort by scroll percentage (0% at top, 100% at bottom)
    const data = scrollData
      .map((p) => ({
        scroll_percentage: Number(p.scroll_percentage),
        sessions: Number(p.sessions),
      }))
      .sort((a, b) => a.scroll_percentage - b.scroll_percentage);

    // SAFETY FIX: The "Total Sessions" is simply the number of people
    // present at 0% scroll (the start of the page).
    // We use this instead of the prop to guarantee 100% accuracy.
    const calculatedMax = data.length > 0 ? data[0].sessions : 0;

    return {
      cleanData: data,
      maxSessions: calculatedMax,
      shouldRender: calculatedMax > 0 && data.length > 0,
    };
  }, [scrollData]);

  // --- 2. Calculate "Smart Markers" (Drops in Retention) ---
  const markers = useMemo(() => {
    if (!shouldRender) return [];

    const milestones: {
      label: string;
      scroll_percentage: number;
      sessions: number;
      color: string;
    }[] = [];

    // We only care about drops: 75%, 50%, 25% (Removed 100% to fix top-line bug)
    const thresholds = [
      { pct: 75, color: "text-green-400 border-green-400" },
      { pct: 50, color: "text-yellow-400 border-yellow-400" },
      { pct: 25, color: "text-red-400 border-red-400" },
    ];

    thresholds.forEach(({ pct, color }) => {
      // Find the exact point where retention drops below this number
      const point = cleanData.find(
        (p) => (p.sessions / maxSessions) * 100 <= pct
      );

      if (point) {
        // Prevent stacking: Don't add if it's within 5% of an existing marker
        const isDuplicate = milestones.some(
          (m) => Math.abs(m.scroll_percentage - point.scroll_percentage) < 5
        );

        if (!isDuplicate && point.scroll_percentage > 0) {
          // Ensure we don't draw at 0px
          milestones.push({
            label: `${pct}% Retention`,
            scroll_percentage: point.scroll_percentage,
            sessions: point.sessions,
            color,
          });
        }
      }
    });

    return milestones;
  }, [cleanData, maxSessions, shouldRender]);

  // --- 3. Calculate Average Fold ---
  const averageFold = useMemo(() => {
    if (!shouldRender) return 50;
    return (
      cleanData.find((point) => point.sessions <= maxSessions * 0.5)
        ?.scroll_percentage || 50
    );
  }, [cleanData, maxSessions, shouldRender]);

  // --- 4. Gradient Logic ---
  const gradientStyle = useMemo(() => {
    if (!shouldRender) return { background: "transparent" };

    const stops = cleanData.map((point) => {
      const retentionPercent = (point.sessions / maxSessions) * 100;
      // 0deg(Red) -> 120deg(Green) -> 240deg(Blue)
      // We map High Retention (100%) to Red (0deg)
      // This is a "Heat" map: Hot (Red) = Lots of users. Cold (Blue) = Few users.
      const hue = (1 - retentionPercent / 100) * 240;
      const alpha = isOverlayHovered ? 0.2 : 0.5; // More transparent when hovering
      return `hsla(${hue}, 100%, 50%, ${alpha}) ${point.scroll_percentage}%`;
    });
    return { background: `linear-gradient(to bottom, ${stops.join(", ")})` };
  }, [cleanData, maxSessions, isOverlayHovered, shouldRender]);

  // --- 5. Hover Math ---
  const getRetentionAtPosition = (yPos: number) => {
    const scrollPercent = (yPos / height) * 100;

    // Find surrounding data points
    const before = cleanData
      .filter((p) => p.scroll_percentage <= scrollPercent)
      .pop() || { sessions: maxSessions, scroll_percentage: 0 };
    const after = cleanData.find((p) => p.scroll_percentage > scrollPercent);

    if (!after) return (before.sessions / maxSessions) * 100;

    // Linear Interpolation for smooth numbers
    const range = after.scroll_percentage - before.scroll_percentage;
    const diff = after.sessions - before.sessions;
    const progress = (scrollPercent - before.scroll_percentage) / (range || 1);

    const interpolatedSessions = before.sessions + diff * progress;
    return (interpolatedSessions / maxSessions) * 100;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const yPos = Math.max(
      0,
      Math.min(height, e.clientY - rect.top + iframeScrollTopRef.current)
    );
    setHoveredPosition(yPos);
    setHoveredPercentage(getRetentionAtPosition(yPos));
  };

  // Early return after all hooks
  if (!shouldRender) return null;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full pointer-events-none"
      style={{
        height: `${height}px`,
        zIndex: 40,
        willChange: "transform",
      }}
      onMouseEnter={() => setIsOverlayHovered(true)}
      onMouseLeave={() => {
        setIsOverlayHovered(false);
        setHoveredPosition(null);
      }}
    >
      {/* 1. Gradient Background */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={gradientStyle}
      />

      {/* 2. Interactive Layer (Captures Mouse) */}
      <div
        className="absolute inset-0 cursor-crosshair"
        style={{ pointerEvents: "auto" }}
        onMouseMove={handleMouseMove}
        onWheel={(e) => {
          if (iframeRef?.current?.contentWindow) {
            iframeRef.current.contentWindow.scrollBy({
              top: e.deltaY * 3.5,
              behavior: "auto",
            });
          } else {
            window.scrollBy({ top: e.deltaY });
          }
        }}
      />

      {/* 3. Retention Markers (75%, 50%, 25%) */}
      {markers.map((marker, i) => (
        <div
          key={i}
          className="absolute w-full pointer-events-none flex items-center group"
          style={{
            top: `${(marker.scroll_percentage / 100) * height}px`,
            zIndex: 45,
          }}
        >
          {/* Dashed Line */}
          <div
            className={`w-full border-t-2 border-dashed opacity-70 group-hover:opacity-100 ${
              marker.color.split(" ")[1]
            }`}
          ></div>

          {/* Tag */}
          <div
            className={`absolute right-4 px-3 py-1 bg-black/80 backdrop-blur-md rounded-full border shadow-xl transform -translate-y-1/2 flex items-center gap-2 ${
              marker.color.split(" ")[1]
            }`}
          >
            <span className={`font-bold ${marker.color.split(" ")[0]}`}>
              {marker.label}
            </span>
            <span className="text-gray-400 text-xs border-l border-gray-600 pl-2">
              {marker.sessions.toLocaleString()} users
            </span>
          </div>
        </div>
      ))}

      {/* 4. Average Fold Marker */}
      <div
        className="absolute w-full border-b-2 border-red-500 pointer-events-none"
        style={{ top: `${(averageFold / 100) * height}px`, zIndex: 50 }}
      >
        <span className="absolute left-4 bottom-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded shadow-sm uppercase tracking-wider font-bold">
          Average Fold
        </span>
      </div>

      {/* 5. Hover Indicator */}
      {hoveredPosition !== null && hoveredPercentage !== null && (
        <div
          className="absolute w-full pointer-events-none"
          style={{ top: `${hoveredPosition}px`, zIndex: 55 }}
        >
          <div className="w-full border-t-2 border-white shadow-sm"></div>
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full mb-1 px-3 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg shadow-2xl border border-gray-700">
            {hoveredPercentage.toFixed(1)}% Retention
            <div className="text-xs text-gray-400 font-normal text-center">
              {Math.round(
                (hoveredPercentage / 100) * maxSessions
              ).toLocaleString()}{" "}
              users
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
