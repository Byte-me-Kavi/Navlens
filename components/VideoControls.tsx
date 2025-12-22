"use client";

import { useState } from "react";

import { TimelineMarker } from "@/features/dev-tools/types/devtools.types";

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  playerReady: boolean;
  markers?: TimelineMarker[];
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

export default function VideoControls({
  isPlaying,
  currentTime,
  duration,
  speed,
  playerReady,
  markers = [],
  onPlayPause,
  onSeek,
  onSpeedChange,
  onSkipBackward,
  onSkipForward,
}: VideoControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const formatTime = (ms: number) => {
    if (Number.isNaN(ms) || ms === undefined || ms === null) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white/90 backdrop-blur-md border-t border-indigo-100 px-6 py-3 w-full relative z-30">
      <div className="max-w-5xl mx-auto">
        {/* Single Row with All Controls */}
        <div className="flex items-center gap-4">
          {/* Left: Play/Pause + Skip Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              disabled={!playerReady}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-200"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip Backward */}
            <button
              onClick={onSkipBackward}
              disabled={!playerReady}
              className="p-2 rounded-xl hover:bg-gray-100/80 disabled:bg-transparent text-gray-500 hover:text-indigo-600 transition-all disabled:opacity-30"
              title="Skip back 10s (J)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* Skip Forward */}
            <button
              onClick={onSkipForward}
              disabled={!playerReady}
              className="p-2 rounded-xl hover:bg-gray-100/80 disabled:bg-transparent text-gray-500 hover:text-indigo-600 transition-all disabled:opacity-30"
              title="Skip forward 10s (L)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Center: Current Time */}
          <span className="text-xs font-semibold text-indigo-900 w-12 flex-shrink-0 text-center font-mono">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar Container */}
          <div className="flex-1 h-8 flex items-center group relative">
            
            {/* Loading Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                {!playerReady && (
                   <span className="text-[10px] font-bold text-indigo-500 bg-white/80 px-2 py-0.5 rounded-full shadow-sm animate-pulse border border-indigo-100">
                     INITIALIZING...
                   </span>
                )}
            </div>

            {/* Markers */}
            {playerReady && markers.map((marker, idx) => {
              // Clamp negative timestamps to 0 to ensure pre-session errors are visible at start
              const effectiveTime = Math.max(0, marker.timestamp);
              const positionPercent = (effectiveTime / duration) * 100;
              
              if (positionPercent < 0 || positionPercent > 100) return null;
              
              let colorClass = "bg-gray-400";
              let zIndex = 11;
              
              if (marker.type === 'error') {
                colorClass = "bg-red-500 ring-2 ring-red-200";
                zIndex = 20;
              } else if (marker.type === 'network-error') {
                colorClass = "bg-amber-500 ring-2 ring-amber-200";
                zIndex = 15;
              } else if (marker.type === 'vital-poor') {
                 // Optimization: Only show vitals if we have few markers or on hover? 
                 // For now, let's skip printing vital markers on seek bar to avoid clutter
                 // unless specifically asked. The prompt asked for console & network usage markers.
                 // "marked when network error console error signals appear"
                 return null;
              } else if (marker.type === 'rage-click') {
                colorClass = "bg-rose-600 ring-2 ring-rose-300 animate-pulse";
                zIndex = 30; // High priority
              } else if (marker.type === 'dead-click') {
                colorClass = "bg-gray-500 ring-2 ring-gray-300";
                zIndex = 25;
              }

              return (
                <div
                  key={idx}
                  className={`absolute -top-3 w-2.5 h-2.5 rounded-full pointer-events-none transition-transform hover:scale-150 ${colorClass}`}
                  style={{ left: `${positionPercent}%`, zIndex }}
                  title={`${marker.label} at ${formatTime(marker.timestamp)}`}
                />
              );
            })}

            <input
              type="range"
              min="0"
              max={Math.max(duration || 0, 1)}
              value={
                Number.isNaN(currentTime)
                  ? 0
                  : Math.min(currentTime || 0, duration || 0)
              }
              onChange={(e) => onSeek(parseInt(e.target.value) || 0)}
              disabled={!playerReady}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer relative z-20
              disabled:cursor-not-allowed
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-indigo-600
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-all
              [&::-webkit-slider-thumb]:duration-150
              
              group-hover:[&::-webkit-slider-thumb]:w-4
              group-hover:[&::-webkit-slider-thumb]:h-4
              group-hover:[&::-webkit-slider-thumb]:shadow-lg
              group-hover:[&::-webkit-slider-thumb]:shadow-indigo-500/30
              
              [&::-moz-range-thumb]:w-3
              [&::-moz-range-thumb]:h-3
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-indigo-600
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:border-0
              
              hover:h-2 transition-all disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${
                  duration > 0 && !Number.isNaN(currentTime)
                    ? (currentTime / duration) * 100
                    : 0
                }%, #e5e7eb ${
                  duration > 0 && !Number.isNaN(currentTime)
                    ? (currentTime / duration) * 100
                    : 0
                }%, #e5e7eb 100%)`,
              }}
            />
          </div>

          {/* Duration */}
          <span className="text-xs font-medium text-gray-400 w-12 text-center flex-shrink-0 font-mono">
            {formatTime(duration)}
          </span>

          {/* Right: Speed Control */}
          <div className="relative flex-shrink-0 border-l border-gray-200 pl-4 ml-1">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              disabled={!playerReady}
              className="px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:bg-transparent text-gray-600 hover:text-indigo-700 text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 disabled:opacity-50 border border-transparent hover:border-indigo-100"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{speed}x</span>
            </button>

            {/* Speed Menu */}
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-3 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl shadow-indigo-900/10 border border-gray-100 overflow-hidden z-50 w-24 p-1">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onSpeedChange(s);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs font-medium text-left transition-all rounded-lg ${
                      speed === s
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
