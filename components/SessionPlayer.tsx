"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import VideoControls from "./VideoControls";

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
    flex: 1;
  }

  .rrweb-player .replayer {
    width: 100% !important;
    height: 100% !important;
  }

  .rrweb-player iframe {
    width: 100% !important;
    height: 100% !important;
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
}

export default function SessionPlayer({ events }: SessionPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<rrwebPlayer | null>(null);

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
    if (playerInstanceRef.current && events.length > 0) {
      return; // Reuse existing player
    }

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

    return () => {
      // Cleanup will be handled by useEffect cleanup
    };
  }, [events]); // Re-create player when events change

  // Control handlers with direct access to player instance
  const togglePlay = () => {
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
  };

  const handleSeek = (timeMs: number) => {
    if (!playerInstanceRef.current) return;

    // 1. Optimistic UI update
    setCurrentTime(timeMs);

    // 2. Command Player
    // rrweb-player .goto() usually expects milliseconds relative to start
    playerInstanceRef.current.goto(timeMs);

    // 3. Keep playing if we were playing
    if (isPlaying) {
      playerInstanceRef.current.play();
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    if (!playerInstanceRef.current) return;

    try {
      if (typeof playerInstanceRef.current.setSpeed === "function") {
        playerInstanceRef.current.setSpeed(newSpeed);
        setSpeed(newSpeed);
      }
    } catch (error) {
      console.error("Speed change error:", error);
    }
  };

  const skipForward = () => {
    const newTime = Math.min(currentTime + 10000, duration);
    handleSeek(newTime);
  };

  const skipBackward = () => {
    const newTime = Math.max(currentTime - 10000, 0);
    handleSeek(newTime);
  };

  return (
    <div className="session-player-container h-96 flex flex-col bg-gray-900">
      <style>{playerStyles}</style>

      {/* Player Window */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={playerRef} className="w-full h-full" />
      </div>

      {/* Controls Bar */}
      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        speed={speed}
        playerReady={playerReady}
        onPlayPause={togglePlay}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
        onSkipForward={skipForward}
        onSkipBackward={skipBackward}
      />
    </div>
  );
}
