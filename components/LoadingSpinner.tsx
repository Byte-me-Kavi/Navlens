"use client";

export default function LoadingSpinner({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-6">
        {/* Windows 11 Loading Animation - Segmented Ring */}
        <div className="relative w-16 h-16">
          {/* Static background ring */}
          <svg
            className="absolute inset-0"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
          >
            {/* 8 segments in a circle */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const x = 32 + 24 * Math.cos(angle);
              const y = 32 + 24 * Math.sin(angle);
              return (
                <circle
                  key={`bg-${i}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="rgba(255, 255, 255, 0.3)"
                />
              );
            })}
          </svg>

          {/* Animated segments */}
          <style>{`
            @keyframes win11-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .win11-loader {
              animation: win11-spin 1.2s linear infinite;
            }
          `}</style>

          <svg
            className="absolute inset-0 win11-loader"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
          >
            {/* 8 animated segments */}
            {[0, 1, 2, 3].map((i) => {
              const angle = (i * 45 - 90) * (Math.PI / 180);
              const x = 32 + 24 * Math.cos(angle);
              const y = 32 + 24 * Math.sin(angle);
              const opacity = 1 - i * 0.25;
              return (
                <circle
                  key={`active-${i}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={`rgba(59, 130, 246, ${opacity})`}
                />
              );
            })}
          </svg>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-1">
          <p className="text-gray-700 font-semibold text-lg">{message}</p>
          <p className="text-gray-500 text-sm">Please wait...</p>
        </div>
      </div>
    </div>
  );
}
