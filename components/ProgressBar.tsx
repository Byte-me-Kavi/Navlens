"use client";

import { useState, useEffect } from "react";

interface ProgressBarProps {
  isVisible: boolean;
  message?: string;
}

export default function ProgressBar({
  isVisible,
  message = "Capturing your live preview...this may take a while",
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Simulate progress: start fast, slow down, reach 90% quickly
    const intervals = [
      { time: 100, increment: 15 }, // 0-15% in 100ms
      { time: 200, increment: 20 }, // 15-35% in 200ms
      { time: 300, increment: 15 }, // 35-50% in 300ms
      { time: 400, increment: 15 }, // 50-65% in 400ms
      { time: 600, increment: 15 }, // 65-80% in 600ms
      { time: 800, increment: 8 }, // 80-88% in 800ms
    ];

    let currentProgress = 0;
    let timeElapsed = 0;

    const timer = setInterval(() => {
      let added = false;

      for (const interval of intervals) {
        if (timeElapsed >= 0 && timeElapsed < interval.time) {
          if (Math.random() > 0.7) {
            // Random increment for natural feel
            currentProgress = Math.min(
              currentProgress + interval.increment * 0.5,
              90
            );
            setProgress(currentProgress);
            added = true;
          }
          break;
        }
      }

      timeElapsed += 50;

      // Stop incrementing at 90%
      if (currentProgress >= 90) {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full space-y-2 animate-in fade-in duration-300">
      <p className="text-sm text-gray-600 font-medium">{message}</p>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-linear-to-r from-green-400 to-green-600 h-full rounded-full transition-all duration-300 ease-out shadow-lg"
          style={{
            width: `${progress}%`,
            boxShadow: "0 0 10px rgba(34, 197, 94, 0.6)",
          }}
        ></div>
      </div>
      <p className="text-xs text-gray-500">{progress}%</p>
    </div>
  );
}
