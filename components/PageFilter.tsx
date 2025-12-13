"use client";

import React, { useEffect } from "react";
import { FunnelIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { usePageFilter } from "@/context/PageFilterContext";
import { useSite } from "@/app/context/SiteContext";

interface PageFilterProps {
  className?: string;
  showLabel?: boolean;
}

export default function PageFilter({ className = "", showLabel = true }: PageFilterProps) {
  const { selectedPagePath, setSelectedPagePath, availablePages, setAvailablePages, isLoading, setIsLoading } = usePageFilter();
  const { selectedSiteId } = useSite();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch available pages when site changes
  useEffect(() => {
    if (!selectedSiteId) {
      setAvailablePages([]);
      return;
    }

    const fetchPages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/get-pages-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: selectedSiteId }),
        });
        if (response.ok) {
          const data = await response.json();
          setAvailablePages(data.pagePaths || []);
        }
      } catch (error) {
        console.error("Failed to fetch pages:", error);
        setAvailablePages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, [selectedSiteId, setAvailablePages, setIsLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format page path for display
  const formatPagePath = (path: string): string => {
    if (path === "/" || path === "") return "Homepage";
    // Truncate long paths
    if (path.length > 30) {
      return "..." + path.slice(-27);
    }
    return path;
  };

  const displayText = selectedPagePath 
    ? formatPagePath(selectedPagePath) 
    : "All Pages";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm disabled:opacity-50"
      >
        <FunnelIcon className="w-4 h-4 text-blue-600" />
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
            {isLoading ? "Loading..." : displayText}
          </span>
        )}
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isLoading && (
        <div className="absolute z-50 mt-2 right-0 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="py-2 max-h-80 overflow-y-auto">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Filter by Page
            </div>
            
            {/* All Pages Option */}
            <button
              onClick={() => {
                setSelectedPagePath(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                selectedPagePath === null ? "bg-blue-50 text-blue-700" : "text-gray-700"
              }`}
            >
              <span className={selectedPagePath === null ? "font-semibold" : "font-medium"}>
                All Pages
              </span>
              {selectedPagePath === null && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>

            {/* Divider */}
            <div className="border-t border-gray-100 my-1" />

            {/* Page Options */}
            {availablePages.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No pages found for this site
              </div>
            ) : (
              availablePages.map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    setSelectedPagePath(page);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                    selectedPagePath === page ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <span 
                    className={`truncate ${selectedPagePath === page ? "font-semibold" : "font-medium"}`}
                    title={page}
                  >
                    {formatPagePath(page)}
                  </span>
                  {selectedPagePath === page && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
