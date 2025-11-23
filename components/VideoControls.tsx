"use client";

import { useState } from "react";

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  playerReady: boolean;
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
    <div className="bg-linear-to-r from-slate-100 to-gray-50 border-t w-full border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 w-12">
            {formatTime(currentTime)}
          </span>
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
            className="flex-1 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-600
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:bg-blue-700
            [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-blue-600
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:hover:bg-blue-700
            hover:h-2 transition-all disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${
                duration > 0 && !Number.isNaN(currentTime)
                  ? (currentTime / duration) * 100
                  : 0
              }%, #d1d5db ${
                duration > 0 && !Number.isNaN(currentTime)
                  ? (currentTime / duration) * 100
                  : 0
              }%, #d1d5db 100%)`,
            }}
          />
          <span className="text-xs font-medium text-gray-600 w-12 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              disabled={!playerReady}
              className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
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
              className="p-2 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all disabled:opacity-50"
              title="Skip back 10s (J)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11 5V1l-5 5 5 5v-4c5.523 0 10 4.477 10 10s-4.477 10-10 10S1 15.523 1 10h-2c0 6.627 5.373 12 12 12s12-5.373 12-12S17.627 5 11 5z" />
              </svg>
            </button>

            {/* Skip Forward */}
            <button
              onClick={onSkipForward}
              disabled={!playerReady}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all disabled:opacity-50"
              title="Skip forward 10s (L)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 5V1l5 5-5 5v-4c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10h2c0 6.627-5.373 12-12 12S1 15.627 1 12 6.373 0 13 0v5z" />
              </svg>
            </button>
          </div>

          {/* Speed Control */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              disabled={!playerReady}
              className="px-3 py-2 rounded-lg hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 hover:text-gray-900 text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{speed}x</span>
            </button>

            {/* Speed Menu */}
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onSpeedChange(s);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left transition-all ${
                      speed === s
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
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
