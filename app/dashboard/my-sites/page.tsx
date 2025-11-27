"use client";

import { useEffect } from "react";
import { useSite } from "@/app/context/SiteContext";
import SiteManager from "./SiteManager";
import LoadingSpinner from "@/components/LoadingSpinner";

// This is now a Client Component that uses centralized site data
export default function SitesPage() {
  const { sites, sitesLoading, sitesError, fetchSites } = useSite();

  // Ensure sites are fetched (will use cache if available)
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (sitesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-600">{sitesError}</div>
        </div>
      </div>
    );
  }

  // Pass the fetched sites to the Client Component
  return <SiteManager sites={sites} />;
}
