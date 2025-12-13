"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

interface PageFilterContextType {
  selectedPagePath: string | null;
  setSelectedPagePath: (path: string | null) => void;
  availablePages: string[];
  setAvailablePages: (pages: string[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const PageFilterContext = createContext<PageFilterContextType | undefined>(undefined);

const STORAGE_KEY = "navlens_page_filter";

interface PageFilterProviderProps {
  children: ReactNode;
}

export function PageFilterProvider({ children }: PageFilterProviderProps) {
  const [selectedPagePath, setSelectedPagePathState] = useState<string | null>(() => {
    // Try to restore from localStorage on initial load
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return stored;
        }
      } catch {
        // Ignore errors
      }
    }
    return null;
  });

  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Persist selection to localStorage
  useEffect(() => {
    try {
      if (selectedPagePath) {
        localStorage.setItem(STORAGE_KEY, selectedPagePath);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [selectedPagePath]);

  const setSelectedPagePath = useCallback((path: string | null) => {
    setSelectedPagePathState(path);
  }, []);

  const value = useMemo(() => ({
    selectedPagePath,
    setSelectedPagePath,
    availablePages,
    setAvailablePages,
    isLoading,
    setIsLoading,
  }), [selectedPagePath, setSelectedPagePath, availablePages, isLoading]);

  return (
    <PageFilterContext.Provider value={value}>
      {children}
    </PageFilterContext.Provider>
  );
}

export function usePageFilter() {
  const context = useContext(PageFilterContext);
  if (context === undefined) {
    throw new Error("usePageFilter must be used within a PageFilterProvider");
  }
  return context;
}
