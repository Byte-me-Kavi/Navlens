"use client";

import React, { useEffect, useRef, useState } from "react";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { XMarkIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/outline";

interface ReportSessionPlayerProps {
  siteId: string;
  sessionId: string;
  onClose: () => void;
}

export default function ReportSessionPlayer({ siteId, sessionId, onClose }: ReportSessionPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<rrwebPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const fetchAndPlay = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch events from public API
        const response = await fetch('/api/public/session-replay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, sessionId })
        });

        if (!response.ok) {
          throw new Error('Failed to load session');
        }

        const data = await response.json();
        
        if (!data.events || data.events.length === 0) {
          throw new Error('No events found for this session');
        }

        // Initialize player
        if (containerRef.current && !playerRef.current) {
          containerRef.current.innerHTML = '';
          
          playerRef.current = new rrwebPlayer({
            target: containerRef.current,
            props: {
              events: data.events,
              width: 800,
              height: 500,
              autoPlay: true,
              showController: true,
              skipInactive: true,
              speedOption: [1, 2, 4, 8],
            },
          });

          setDuration(data.meta?.duration || 0);
          setIsPlaying(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Player error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setLoading(false);
      }
    };

    fetchAndPlay();

    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current = null;
      }
    };
  }, [siteId, sessionId]);

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <PlayIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Session Replay</h3>
              <p className="text-xs text-gray-500">
                {sessionId.slice(0, 12)}... • {duration > 0 && formatDuration(duration)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Player Container */}
        <div className="relative bg-gray-900 min-h-[500px] flex items-center justify-center">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white text-sm">Loading session replay...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
              <div className="text-red-400 text-center">
                <p className="text-lg font-medium mb-2">Failed to load session</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
            </div>
          )}

          <div 
            ref={containerRef} 
            className="rrweb-player-container"
            style={{ display: loading || error ? 'none' : 'block' }}
          />
        </div>

        {/* Footer with controls hint */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Use the timeline below to scrub through the session
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              disabled={loading || !!error}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {isPlaying ? (
                <>
                  <PauseIcon className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  Play
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
