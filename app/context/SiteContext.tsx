"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SiteContextType {
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  return (
    <SiteContext.Provider value={{ selectedSiteId, setSelectedSiteId }}>
      {children}
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
