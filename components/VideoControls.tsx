"use client";

import { useState, useRef, useEffect, useMemo } from "react";

import { TimelineMarker } from "@/features/dev-tools/types/devtools.types";
import { FiAlertCircle, FiWifiOff, FiZap, FiMousePointer } from "react-icons/fi";

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
  onMarkerClick?: (marker: TimelineMarker) => void;
}

// Helper component for clustered markers
const MarkerCluster = ({ 
  cluster, 
  duration, 
  onSeek, 
  onMarkerClick 
}: { 
  cluster: TimelineMarker[]; 
  duration: number; 
  onSeek: (time: number) => void;
  onMarkerClick?: (marker: TimelineMarker) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200); // 200ms delay to prevent flickering across gaps
  };

  // Helper function for formatting time (copied from VideoControls for self-containment)
  const formatTime = (ms: number) => {
    if (Number.isNaN(ms) || ms === undefined || ms === null) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Sort cluster by priority
  const priorityOrder = { 'rage-click': 4, 'error': 3, 'dead-click': 2, 'network-error': 1, 'vital-poor': 0 };
  const sortedCluster = useMemo(() => {
    return [...cluster].sort((a, b) => {
      const pA = priorityOrder[a.type as keyof typeof priorityOrder] || 0;
      const pB = priorityOrder[b.type as keyof typeof priorityOrder] || 0;
      return pB - pA;
    });
  }, [cluster]);

  const avgTimestamp = cluster.reduce((sum, m) => sum + m.timestamp, 0) / cluster.length;
  const positionPercent = (avgTimestamp / duration) * 100;

  return (
    <div 
      className="absolute bottom-5 transform -translate-x-1/2 w-6 h-6 z-20"
      style={{ left: `${positionPercent}%` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {sortedCluster.map((marker, idx) => {
         let Icon = FiAlertCircle;
         let bgClass = "bg-gray-400";
         const iconSize = "w-3 h-3"; 
         
         if (marker.type === 'error') {
             Icon = FiAlertCircle;
             bgClass = "bg-rose-600 shadow-md shadow-rose-900/20";
         } else if (marker.type === 'network-error') {
             Icon = FiWifiOff;
             bgClass = "bg-amber-500 shadow-md shadow-amber-900/20";
         } else if (marker.type === 'vital-poor') {
             return null;
         } else if (marker.type === 'rage-click') {
             Icon = FiZap;
             bgClass = "bg-rose-500 animate-pulse shadow-md shadow-rose-900/20";
         } else if (marker.type === 'dead-click') {
             Icon = FiMousePointer;
             bgClass = "bg-gray-500";
         }

         const transformY = isHovered ? -(idx * 28) : 0;
         const zIndex = sortedCluster.length - idx;

         return (
             <button
                 key={`${marker.timestamp}-${idx}`}
                 onClick={(e) => {
                     e.stopPropagation();
                     onSeek(marker.timestamp);
                     if (onMarkerClick) onMarkerClick(marker);
                 }}
                 className={`absolute bottom-0 left-0 w-6 h-6 flex items-center justify-center rounded-full text-white transition-all duration-300 ease-out cursor-pointer hover:scale-110 hover:z-50 border border-white/20 ${bgClass}`}
                 style={{
                     zIndex,
                     transform: `translateY(${transformY}px)`,
                 }}
                 title={`${marker.label} (${formatTime(marker.timestamp)})`}
             >
                 <Icon className={iconSize} />
             </button>
         );
      })}
      
      {/* Counter Badge if > 1 and collapsed */}
      {cluster.length > 1 && (
         <div 
           className={`absolute -top-2 -right-2 bg-indigo-600 text-[9px] font-bold text-white px-1 rounded-full shadow-sm z-50 transition-opacity duration-200 pointer-events-none border border-white ${isHovered ? 'opacity-0' : 'opacity-100'}`}
         >
             {cluster.length}
         </div>
      )}
    </div>
  );
};

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
  onMarkerClick,
}: VideoControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Local state for smooth slider interaction without overwhelming the player
  const [sliderValue, setSliderValue] = useState(currentTime || 0);
  const [isInteracting, setIsInteracting] = useState(false);
  const seekDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync slider with player time when not interacting
  useEffect(() => {
    if (!isInteracting) {
      setSliderValue(Number.isNaN(currentTime) ? 0 : currentTime);
    }
  }, [currentTime, isInteracting]);
  
  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (seekDebounceRef.current) {
        clearTimeout(seekDebounceRef.current);
      }
    };
  }, []);

  const formatTime = (ms: number) => {
    if (Number.isNaN(ms) || ms === undefined || ms === null) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    setSliderValue(newValue);
    setIsInteracting(true);

    // Debounce the actual seek trigger
    if (seekDebounceRef.current) {
      clearTimeout(seekDebounceRef.current);
    }

    seekDebounceRef.current = setTimeout(() => {
      onSeek(newValue);
    }, 200); // 200ms debounce
  };

  const handleSliderCommit = () => {
    // Clear any pending debounce
    if (seekDebounceRef.current) {
      clearTimeout(seekDebounceRef.current);
      seekDebounceRef.current = null;
    }
    
    // Trigger immediate seek on release
    onSeek(sliderValue);
    
    // Small delay before allowing external updates again to prevent jumping
    setTimeout(() => {
      setIsInteracting(false);
    }, 100);
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
            {formatTime(sliderValue)}
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
            {playerReady && (() => {
                // 1. Sort by timestamp first
                const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
                
                // 2. Group overlapping markers
                const clusters: TimelineMarker[][] = [];
                const THRESHOLD_PERCENT = 3; // 3% overlap threshold

                sortedMarkers.forEach(marker => {
                    if (marker.timestamp < 0) return; // Skip invalid
                    
                    const markerPos = (marker.timestamp / duration) * 100;
                    if (markerPos < 0 || markerPos > 100) return;

                    const lastCluster = clusters[clusters.length - 1];
                    if (lastCluster) {
                        const lastRepresentative = lastCluster[0];
                        const lastPos = (lastRepresentative.timestamp / duration) * 100;
                        if (Math.abs(markerPos - lastPos) < THRESHOLD_PERCENT) {
                            lastCluster.push(marker);
                            return;
                        }
                    }
                    clusters.push([marker]);
                });

                // 3. Render Clusters
                return clusters.map((cluster, clusterIdx) => (
                    <MarkerCluster 
                        key={clusterIdx}
                        cluster={cluster}
                        duration={duration}
                        onSeek={onSeek}
                        onMarkerClick={onMarkerClick}
                    />
                ));
            })()}

            <input
              type="range"
              min="0"
              max={Math.max(duration || 0, 1)}
              value={sliderValue}
              onChange={handleSliderChange}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
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
                  duration > 0
                    ? (sliderValue / duration) * 100
                    : 0
                }%, #e5e7eb ${
                  duration > 0
                    ? (sliderValue / duration) * 100
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
