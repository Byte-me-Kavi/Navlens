"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

// Predefined date range presets
export type DateRangePreset = 
  | "today" 
  | "yesterday" 
  | "last7days" 
  | "last30days" 
  | "last90days" 
  | "thisMonth" 
  | "lastMonth" 
  | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
}

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setPreset: (preset: DateRangePreset) => void;
  formatForApi: () => { startDate: string; endDate: string };
  presetLabel: string;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

// Helper to get date range from preset
function getDateRangeFromPreset(preset: DateRangePreset): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { startDate: today, endDate: endOfToday };
    
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return { startDate: yesterday, endDate: endOfYesterday };
    }
    
    case "last7days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: endOfToday };
    }
    
    case "last30days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { startDate: start, endDate: endOfToday };
    }
    
    case "last90days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      return { startDate: start, endDate: endOfToday };
    }
    
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start, endDate: endOfToday };
    }
    
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }
    
    case "custom":
    default:
      // Default to last 7 days for custom until user selects
      const defaultStart = new Date(today);
      defaultStart.setDate(defaultStart.getDate() - 6);
      return { startDate: defaultStart, endDate: endOfToday };
  }
}

// Get human-readable label for preset
function getPresetLabel(preset: DateRangePreset): string {
  const labels: Record<DateRangePreset, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last7days: "Last 7 Days",
    last30days: "Last 30 Days",
    last90days: "Last 90 Days",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    custom: "Custom Range",
  };
  return labels[preset];
}

const STORAGE_KEY = "navlens_date_range";

interface DateRangeProviderProps {
  children: ReactNode;
  defaultPreset?: DateRangePreset;
}

export function DateRangeProvider({ children, defaultPreset = "last7days" }: DateRangeProviderProps) {
  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    // Try to restore from localStorage on initial load
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate),
            preset: parsed.preset as DateRangePreset,
          };
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    const { startDate, endDate } = getDateRangeFromPreset(defaultPreset);
    return { startDate, endDate, preset: defaultPreset };
  });

  // Persist to localStorage when dateRange changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        preset: dateRange.preset,
      }));
    } catch {
      // Ignore storage errors
    }
  }, [dateRange]);

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
  }, []);

  const setPreset = useCallback((preset: DateRangePreset) => {
    const { startDate, endDate } = getDateRangeFromPreset(preset);
    setDateRangeState({ startDate, endDate, preset });
  }, []);

  const formatForApi = useCallback(() => {
    return {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
    };
  }, [dateRange]);

  const presetLabel = useMemo(() => getPresetLabel(dateRange.preset), [dateRange.preset]);

  const value = useMemo(() => ({
    dateRange,
    setDateRange,
    setPreset,
    formatForApi,
    presetLabel,
  }), [dateRange, setDateRange, setPreset, formatForApi, presetLabel]);

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error("useDateRange must be used within a DateRangeProvider");
  }
  return context;
}

// Export helper functions for use outside React components
export { getDateRangeFromPreset, getPresetLabel };
