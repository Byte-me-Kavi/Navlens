"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import VideoControls from "./VideoControls";
import { TimelineMarker } from "@/features/dev-tools/types/devtools.types";

const playerStyles = `
  .session-player-container {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .rrweb-player {
    width: 100% !important;
    height: 100% !important;
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .rrweb-player .replayer-wrapper {
    flex: 1 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
  }

  .rrweb-player .replayer {
    /* Don't override width/height - let rrweb scale naturally */
    max-width: 100% !important;
    max-height: 100% !important;
  }

  .rrweb-player iframe {
    /* Let the iframe scale with the replayer */
    border: none !important;
  }
`;

export interface RRWebEvent {
  type: number;
  data: Record<string, unknown>;
  timestamp: number;
  [key: string]: unknown;
}

interface SessionPlayerProps {
  events: RRWebEvent[];
  markers?: TimelineMarker[];
}

export default function SessionPlayer({ events, markers = [] }: SessionPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  // UI State
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  // 1. Calculate Duration Immediately from Data (No waiting for player)
  const duration = useMemo(() => {
    if (events && events.length > 1) {
      const startTime = events[0].timestamp;
      const endTime = events[events.length - 1].timestamp;
      return endTime - startTime;
    }
    return 0;
  }, [events]);

  // Initialize player
  useEffect(() => {
    if (!playerRef.current || !events || events.length === 0) return;

    // Check if player already exists and events haven't changed significantly
    // REMOVED: We want to force re-creation if `events` prop changes (e.g. sorted/cleaned), 
    // because React considers the new array a new reference.
    // Passing [events] in dependency array is enough to trigger this effect.
    
    // However, if the parent passes the SAME events array reference (no change), effect won't run.
    // If parent creates a NEW array reference every render, this effect runs every render -> Bad.
    // Ensure parent memoizes events or only updates them truly when changed.
    
    // In our case, page.tsx sets events once (or twice). So it's safe to recreate.

    // Cleanup old instance gracefully
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.pause?.();
        // Don't clear DOM immediately, let it transition
      } catch {
        // Ignore
      }
    }

    // Clear DOM only for new player
    if (playerRef.current && playerRef.current.innerHTML) {
      playerRef.current.innerHTML = "";
    }

    console.log("Creating new player with events length:", events.length);

    try {
      const newPlayer = new rrwebPlayer({
        target: playerRef.current,
        props: {
          events: events,
          autoPlay: false,
          showController: false,
          speedOption: [0.5, 1, 1.5, 2, 4, 8],
          skipInactive: true,
          mouseTail: {
            duration: 1000,
            lineCap: "round",
            lineWidth: 2,
            strokeStyle: "#3b82f6",
          },
          // Add error handling for DOM reconstruction issues
          liveMode: false,
          insertStyleRules: [],
          triggerFocus: false,
        },
      });

      console.log("Player created:", newPlayer);

      playerInstanceRef.current = newPlayer;

      // Wait for iframe to load before accessing replayer
      const iframe = playerRef.current?.querySelector("iframe");
      if (iframe) {
        iframe.addEventListener("load", () => {
          console.log("Iframe loaded");
        });
      }

      // Setup event listeners
      const handleUiUpdate = (payload: { payload: number }) => {
        // Payload is a percentage (0 to 1)
        const percentage = payload.payload;

        // We calculate current time based on the Duration we already know
        // Use the duration state, or recalculate safely
        const totalTime =
          events[events.length - 1].timestamp - events[0].timestamp;

        setCurrentTime(percentage * totalTime);
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      // Wait for player to be fully ready before adding listeners
      setTimeout(() => {
        try {
          newPlayer.addEventListener("ui-update-progress", handleUiUpdate);
          newPlayer.addEventListener("play", handlePlay);
          newPlayer.addEventListener("pause", handlePause);
          setPlayerReady(true);
          console.log("Event listeners added");
        } catch (e) {
          console.error("Error adding event listeners:", e);
        }
      }, 1000);
    } catch (error) {
      console.error("Error creating rrweb player:", error);
      setPlayerReady(false);
    }

    return () => {
      // Cleanup: Destroy player instance to prevent duplication
      if (playerInstanceRef.current) {
        console.log("Destroying player instance");
        try {
          // Pause if running
          playerInstanceRef.current.pause?.();
          
          // Use the internal replayer destroy if available
          const replayer = playerInstanceRef.current.getReplayer?.();
          if (replayer && typeof replayer.destroy === 'function') {
             replayer.destroy();
          }
          
        } catch (e) {
          console.error("Error destroying player:", e);
        }
        playerInstanceRef.current = null;
      }
      
      if (playerRef.current) {
        playerRef.current.innerHTML = "";
      }
    };
  }, [events]); // Re-create player when events change

  // Control handlers with direct access to player instance
  const togglePlay = useCallback(() => {
    if (!playerInstanceRef.current) return;

    try {
      if (isPlaying) {
        if (typeof playerInstanceRef.current.pause === "function") {
          playerInstanceRef.current.pause();
        }
        setIsPlaying(false);
      } else {
        if (typeof playerInstanceRef.current.play === "function") {
          playerInstanceRef.current.play();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Play/pause error:", error);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((timeMs: number) => {
    if (!playerInstanceRef.current) return;

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(timeMs, duration));

    // 1. Optimistic UI update
    setCurrentTime(clampedTime);

    // 2. Command Player with error handling
    try {
      playerInstanceRef.current.goto(clampedTime);

      // 3. Keep playing if we were playing
      if (isPlaying) {
        playerInstanceRef.current.play();
      }
    } catch (error) {
      console.error("Seek error (rrweb DOM reconstruction issue):", error);
      try {
        playerInstanceRef.current.pause();
        setIsPlaying(false);
        playerInstanceRef.current.goto(0);
        setCurrentTime(0);
      } catch (recoveryError) {
        console.error("Recovery failed:", recoveryError);
      }
    }
  }, [duration, isPlaying]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    if (!playerInstanceRef.current) return;

    try {
      if (typeof playerInstanceRef.current.setSpeed === "function") {
        playerInstanceRef.current.setSpeed(newSpeed);
        setSpeed(newSpeed);
      }
    } catch (error) {
      console.error("Speed change error:", error);
    }
  }, []);

  const skipForward = useCallback(() => {
    const newTime = Math.min(currentTime + 10000, duration);
    handleSeek(newTime);
  }, [currentTime, duration, handleSeek]);

  const skipBackward = useCallback(() => {
    const newTime = Math.max(currentTime - 10000, 0);
    handleSeek(newTime);
  }, [currentTime, handleSeek]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'KeyF':
          e.preventDefault();
          // Toggle fullscreen
          const container = playerRef.current?.parentElement?.parentElement;
          if (container) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              container.requestFullscreen?.();
            }
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Increase speed
          handleSpeedChange(speed < 8 ? speed * 2 : speed);
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Decrease speed
          handleSpeedChange(speed > 0.5 ? speed / 2 : speed);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speed, togglePlay, skipForward, skipBackward, handleSpeedChange]);

  return (
    <div className="session-player-container h-full flex flex-col bg-gray-900">
      <style>{playerStyles}</style>

      {/* Player Window */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={playerRef} className="w-full h-full" />
      </div>

        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          speed={speed}
          playerReady={playerReady}
          markers={markers}
          onPlayPause={togglePlay}
          onSeek={handleSeek}
          onSpeedChange={handleSpeedChange}
          onSkipBackward={skipBackward}
          onSkipForward={skipForward}
        />
    </div>
  );
}
