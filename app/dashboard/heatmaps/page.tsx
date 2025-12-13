"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import { PresentationChartBarIcon } from "@heroicons/react/24/outline";

export default function HeatmapsPage() {
  const {
    selectedSiteId,
    sites,
    sitesLoading,
    sitesError,
    fetchSites,
    getSiteById,
  } = useSite();
  const router = useRouter();

  // Ensure sites are fetched (will use cache if available)
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Auto-redirect to viewer when site is already selected
  useEffect(() => {
    if (selectedSiteId && !sitesLoading) {
      router.push("/dashboard/heatmaps/heatmap-viewer");
    }
  }, [selectedSiteId, sitesLoading, router]);

  // Get current site for display
  const currentSite = selectedSiteId ? getSiteById(selectedSiteId) : null;

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (sitesError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-600">{sitesError}</div>
        </div>
      </div>
    );
  }

  // If site is selected but we're still on this page (redirect in progress)
  if (selectedSiteId && currentSite) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner message={`Loading ${currentSite.site_name} heatmaps...`} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <PresentationChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Heatmaps</h1>
        </div>
        <p className="text-sm text-gray-600">
          View click, scroll, and mouse movement heatmaps for your sites.
        </p>
      </div>

      {/* No sites or no site selected */}
      {sites.length === 0 ? (
        <NoSitesAvailable />
      ) : (
        <NoSiteSelected 
          featureName="heatmap data"
          description="Click and scroll patterns, mouse movements, and user interactions will appear here."
        />
      )}
    </div>
  );
}
