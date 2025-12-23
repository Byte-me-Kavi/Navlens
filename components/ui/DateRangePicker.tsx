"use client";

import React, { useState, useRef, useEffect } from "react";
import { CalendarIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useDateRange, DateRangePreset } from "@/context/DateRangeContext";

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "last30days", label: "Last 30 Days" },
  { value: "last90days", label: "Last 90 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

interface DateRangePickerProps {
  className?: string;
  showLabel?: boolean;
}

export default function DateRangePicker({ className = "", showLabel = true }: DateRangePickerProps) {
  const { dateRange, setDateRange, setPreset, presetLabel } = useDateRange();
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format date for input fields
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Format date for display
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Handle preset selection
  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === "custom") {
      setShowCustomPicker(true);
      setCustomStart(formatDateForInput(dateRange.startDate));
      setCustomEnd(formatDateForInput(dateRange.endDate));
    } else {
      setPreset(preset);
      setIsOpen(false);
      setShowCustomPicker(false);
    }
  };

  // Handle custom date selection
  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);

      if (startDate <= endDate) {
        setDateRange({
          startDate,
          endDate,
          preset: "custom",
        });
        setIsOpen(false);
        setShowCustomPicker(false);
      }
    }
  };

  // Get display text
  const displayText = dateRange.preset === "custom"
    ? `${formatDateForDisplay(dateRange.startDate)} - ${formatDateForDisplay(dateRange.endDate)}`
    : presetLabel;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm"
      >
        <CalendarIcon className="w-4 h-4 text-blue-600" />
        {showLabel && (
          <span className="text-sm font-medium text-gray-700">{displayText}</span>
        )}
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Preset Options */}
          {!showCustomPicker && (
            <div className="py-2">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quick Select
              </div>
              {PRESET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePresetSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                    dateRange.preset === option.value ? "bg-blue-50 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <span className={dateRange.preset === option.value ? "font-semibold" : "font-medium"}>
                    {option.label}
                  </span>
                  {dateRange.preset === option.value && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom Date Picker */}
          {showCustomPicker && (
            <div className="p-4 space-y-4">
              <button
                onClick={() => setShowCustomPicker(false)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to presets
              </button>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    max={customEnd || undefined}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    min={customStart || undefined}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply Range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
