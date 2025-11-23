"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

interface SiteContextType {
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSiteId = localStorage.getItem("selectedSiteId");
    if (savedSiteId) {
      setSelectedSiteId(savedSiteId);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever it changes
  const handleSetSelectedSiteId = (siteId: string | null) => {
    setSelectedSiteId(siteId);
    if (siteId) {
      localStorage.setItem("selectedSiteId", siteId);
    } else {
      localStorage.removeItem("selectedSiteId");
    }
  };

  return (
    <SiteContext.Provider
      value={{ selectedSiteId, setSelectedSiteId: handleSetSelectedSiteId }}
    >
      {isHydrated ? children : null}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}
