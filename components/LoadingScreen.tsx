"use client";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-navlens-dark via-blue-50 to-white flex items-center justify-center z-50">
      <div className="relative">
        {/* Gradient spinner */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-linear-to-tr from-navlens-electric-blue via-navlens-purple to-pink-500 opacity-20 blur-xl"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-navlens-electric-blue border-r-navlens-purple border-b-pink-500 animate-spin"></div>
        </div>
      </div>
    </div>
  );
}
