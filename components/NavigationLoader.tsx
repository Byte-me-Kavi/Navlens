"use client";

import { useNavigation } from "@/context/NavigationContext";

export default function NavigationLoader() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin"></div>
        </div>

        {/* Loading Text */}
        <p className="text-gray-700 font-medium">Loading page...</p>
      </div>
    </div>
  );
}
