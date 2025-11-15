"use client";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-navlens-dark via-gray-50 to-white flex items-center justify-center z-50">
      <div className="relative">
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 border-4 border-navlens-accent/30 rounded-full animate-ping"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 border-4 border-navlens-electric-blue/40 rounded-full animate-pulse"></div>
        </div>

        {/* Center spinner */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-navlens-accent/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-navlens-accent border-r-navlens-electric-blue rounded-full animate-spin"></div>
        </div>

        {/* Loading text */}
        <div className="mt-8 text-center">
          <p className="text-white text-lg font-semibold animate-pulse">
            Loading...
          </p>
          <div className="flex gap-1 justify-center mt-2">
            <div
              className="w-2 h-2 bg-navlens-accent rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            ></div>
            <div
              className="w-2 h-2 bg-navlens-electric-blue rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-navlens-purple rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
