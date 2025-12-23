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
  onMarkerClick?: (marker: TimelineMarker) => void;
}

export default function SessionPlayer({ events, markers = [], onMarkerClick }: SessionPlayerProps) {
  // ... (keep existing refs and state)

  // ... (keep existing code)


  const playerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  // UI State
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);

  // 1. Calculate Duration Immediately from Data
  const duration = useMemo(() => {
    if (events && events.length > 1) {
      // Create a sorted view just for duration calculation to be safe
      const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
      const startTime = sortedEvents[0].timestamp;
      const endTime = sortedEvents[sortedEvents.length - 1].timestamp;
      return endTime - startTime;
    }
    return 0;
  }, [events]);

  // Initialize player
  useEffect(() => {
    if (!playerRef.current || !events || events.length === 0) return;

    let initTimer: NodeJS.Timeout;
    let playerInstance: any = null;

    const initializePlayer = () => {
        // Clear DOM
        if (playerRef.current) {
           playerRef.current.innerHTML = "";
        }

        console.log("Creating new player with events length:", events.length);

        try {
            // rrweb requires events to be sorted by timestamp
            // We also deep clone to prevent mutation issues
            const clonedEvents = JSON.parse(JSON.stringify(events)).sort((a: RRWebEvent, b: RRWebEvent) => {
                return a.timestamp - b.timestamp;
            });

            const newPlayer = new rrwebPlayer({
                target: playerRef.current!,
                props: {
                    events: clonedEvents,
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
                    liveMode: false,
                    triggerFocus: false,
                    UNSAFE_replayCanvas: false, 
                },
            });

            console.log("Player created:", newPlayer);
            playerInstance = newPlayer;
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
                const percentage = payload.payload;
                // Use the duration calculated from props for stability
                const totalTime = duration > 0 ? duration : (clonedEvents[clonedEvents.length - 1].timestamp - clonedEvents[0].timestamp);
                setCurrentTime(percentage * totalTime);
            };

            const handlePlay = () => setIsPlaying(true);
            const handlePause = () => setIsPlaying(false);

            // Wait for player to be fully ready before adding listeners
            setTimeout(() => {
                try {
                    if (!playerInstanceRef.current) return;
                    newPlayer.addEventListener("ui-update-progress", handleUiUpdate);
                    newPlayer.addEventListener("play", handlePlay);
                    newPlayer.addEventListener("pause", handlePause);
                    setPlayerReady(true);
                    console.log("Event listeners added");
                } catch (e) {
                    console.error("Error adding event listeners:", e);
                }
            }, 500);

        } catch (error) {
            console.error("Error creating rrweb player:", error);
            setPlayerReady(false);
        }
    };

    // Debounce initialization to handle Strict Mode double-mount
    initTimer = setTimeout(initializePlayer, 100);

    return () => {
        // CLEANUP
        clearTimeout(initTimer);
        
        if (playerInstance) {
            console.log("Destroying player instance");
            try {
                playerInstance.pause?.();
                const replayer = playerInstance.getReplayer?.();
                if (replayer) {
                    replayer.destroy?.();
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
  }, [events, duration]);

  // Recursive safe seek function
  const safeSeek = useCallback((targetTime: number, attempts = 0) => {
      if (!playerInstanceRef.current || attempts > 3) return;
      
      try {
          // Double check player validity before seek
          if (!playerInstanceRef.current || !playerInstanceRef.current.getReplayer()) {
             throw new Error("Player not ready");
          }

          playerInstanceRef.current.goto(targetTime);
          
          // If successful, and we were playing, resume
          if (isPlaying) {
             // Use a safer play call
             setTimeout(() => {
                 if (playerInstanceRef.current && isPlaying) {
                   try { playerInstanceRef.current.play(); } catch(e) { console.warn("Auto-resume failed", e); }
                 }
             }, 50);
          }
      } catch (err) {
          console.warn(`Seek to ${targetTime} failed (attempt ${attempts + 1}):`, err);
          
          // Check for critical DOM errors that require reset
          // if (err instanceof TypeError && err.message.includes("insertBefore")) {
             // This suggests the DOM is out of sync. 
             // We can't easily recover without a full rebuild, but maybe we can skip this frame.
          // }

          // Recursive retry with offset to skip bad frame
          const nextTime = targetTime + 100;
          if (nextTime < duration) {
              setTimeout(() => safeSeek(nextTime, attempts + 1), 50);
          } else {
              // Fallback: Just pause
              setIsPlaying(false);
              try { playerInstanceRef.current?.pause(); } catch(e) {}
          }
      }
  }, [duration, isPlaying]);

  const handleSeek = useCallback((timeMs: number) => {
    if (!playerInstanceRef.current) return;

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(timeMs, duration));

    // 1. Optimistic UI update
    setCurrentTime(clampedTime);

    // 2. Pause first
    if (isPlaying) {
       try { playerInstanceRef.current.pause(); } catch(e) { /* ignore */ }
    }

    // 3. Initiate Safe Seek
    safeSeek(clampedTime);

  }, [duration, isPlaying, safeSeek]); 

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
      // Recovery for play/pause error
      setIsPlaying(false);
    }
  }, [isPlaying]);

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
          onMarkerClick={onMarkerClick}
        />
    </div>
  );
}
