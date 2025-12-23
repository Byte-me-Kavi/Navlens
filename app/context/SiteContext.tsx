"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";


// Full site interface with all details
export interface Site {
  id: string;
  created_at: string;
  site_name: string;
  domain: string;
  api_key: string;
  user_id: string;
  status: 'active' | 'banned' | 'archived';
  is_tracking_enabled?: boolean; // New field for tracking toggle
}

// Pages cache per site
interface SitePagesCache {
  [siteId: string]: {
    pages: string[];
    fetchedAt: number;
  };
}

interface SiteContextType {
  // Selected site
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;

  // All user sites (centralized)
  sites: Site[];
  sitesLoading: boolean;
  sitesError: string | null;
  fetchSites: (forceRefresh?: boolean) => Promise<void>;

  // Helper to get a specific site by ID
  getSiteById: (id: string) => Site | undefined;

  // Timestamp of last fetch (for cache invalidation)
  lastFetchedAt: number | null;

  // Pages list per site (cached)
  getPagesList: (siteId: string, forceRefresh?: boolean) => Promise<string[]>;
  getPagesFromCache: (siteId: string) => string[] | null;
  pagesLoading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

// Cache duration: 5 minutes
const SITES_CACHE_DURATION = 5 * 60 * 1000;
const PAGES_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for pages

export function SiteProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedSiteId");
    }
    return null;
  });

  // Centralized sites state
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  // Pages cache per site - use ref to avoid callback dependency issues
  const pagesCacheRef = useRef<SitePagesCache>({});
  const [pagesLoading, setPagesLoading] = useState(false);

  // Create Supabase client once using ref to prevent recreation on every render
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const supabase = supabaseRef.current;

  useEffect(() => {
    setIsHydrated(true);  
  }, []);

  // Centralized fetch function - called once, used everywhere
  const fetchSites = useCallback(
    async (forceRefresh = false) => {
      // Skip if already loading
      if (sitesLoading) return;

      // Skip if recently fetched (within cache duration) unless force refresh
      if (
        !forceRefresh &&
        lastFetchedAt &&
        Date.now() - lastFetchedAt < SITES_CACHE_DURATION
      ) {
        console.log("⚡ Using cached sites data");
        return;
      }

      setSitesLoading(true);
      setSitesError(null);

      try {
        // Check authentication
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          console.log("No authenticated session - skipping sites fetch");
          setSitesLoading(false);
          return;
        }

        console.log("🔄 Fetching sites from Supabase (centralized)...");

        const { data, error } = await supabase
          .from("sites")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching sites:", error);
          setSitesError("Failed to load sites");
          return;
        }

        console.log(`✅ Sites fetched: ${data?.length || 0} sites`);
        setSites(data || []);
        setLastFetchedAt(Date.now());
      } catch (err) {
        console.error("❌ Error fetching sites:", err);
        setSitesError("An unexpected error occurred");
      } finally {
        setSitesLoading(false);
      }
    },
    [supabase, sitesLoading, lastFetchedAt]
  );

  // Helper to get site by ID
  const getSiteById = useCallback(
    (id: string): Site | undefined => {
      return sites.find((site) => site.id === id);
    },
    [sites]
  );

  // Get pages from cache (synchronous, returns null if not cached)
  const getPagesFromCache = useCallback((siteId: string): string[] | null => {
    const cached = pagesCacheRef.current[siteId];
    if (cached && Date.now() - cached.fetchedAt < PAGES_CACHE_DURATION) {
      return cached.pages;
    }
    return null;
  }, []); // No dependencies - uses ref

  // Fetch pages list for a site (with caching)
  const getPagesList = useCallback(
    async (siteId: string, forceRefresh = false): Promise<string[]> => {
      // Check cache first
      if (!forceRefresh) {
        const cached = pagesCacheRef.current[siteId];
        if (cached && Date.now() - cached.fetchedAt < PAGES_CACHE_DURATION) {
          console.log(`⚡ Using cached pages for site ${siteId}`);
          return cached.pages;
        }
      }

      setPagesLoading(true);
      try {
        console.log(`🔄 Fetching pages list for site ${siteId}...`);
        const response = await fetch("/api/get-pages-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pages");
        }

        const data = await response.json();



        const pages = data.pagePaths || [];

        // Update cache ref
        pagesCacheRef.current = {
          ...pagesCacheRef.current,
          [siteId]: {
            pages,
            fetchedAt: Date.now(),
          },
        };

        console.log(`✅ Cached ${pages.length} pages for site ${siteId}`);
        return pages;
      } catch (error) {
        console.error("❌ Error fetching pages:", error);
        return [];
      } finally {
        setPagesLoading(false);
      }
    },
    [] // No dependencies - uses ref
  );

  // Save to localStorage whenever selectedSiteId changes
  const handleSetSelectedSiteId = useCallback((siteId: string | null) => {
    setSelectedSiteId(siteId);
    if (siteId) {
      localStorage.setItem("selectedSiteId", siteId);
    } else {
      localStorage.removeItem("selectedSiteId");
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SiteContextType>(
    () => ({
      selectedSiteId,
      setSelectedSiteId: handleSetSelectedSiteId,
      sites,
      sitesLoading,
      sitesError,
      fetchSites,
      getSiteById,
      lastFetchedAt,
      getPagesList,
      getPagesFromCache,
      pagesLoading,
    }),
    [
      selectedSiteId,
      handleSetSelectedSiteId,
      sites,
      sitesLoading,
      sitesError,
      fetchSites,
      getSiteById,
      lastFetchedAt,
      getPagesList,
      getPagesFromCache,
      pagesLoading,
    ]
  );

  return (
    <SiteContext.Provider value={contextValue}>
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
