/**
 * Funnels Dashboard Page
 *
 * Main page for managing and viewing conversion funnels
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import {
  useFunnels,
  CreateFunnelModal,
  FunnelCard,
  CreateFunnelRequest,
} from "@/features/funnels";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  FunnelIcon,
  PlusIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { FeatureLock } from "@/components/subscription/FeatureLock";

export default function FunnelsPage() {
  const router = useRouter();
  const {
    sites,
    selectedSiteId,
    setSelectedSiteId,
    sitesLoading,
    sitesError,
    fetchSites,
  } = useSite();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Get funnels for selected site
  const {
    funnels,
    loading: funnelsLoading,
    error: funnelsError,
    createFunnel,
    deleteFunnel,
  } = useFunnels(selectedSiteId);

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
  };

  const handleViewFunnel = (funnelId: string) => {
    router.push(`/dashboard/funnels/${funnelId}`);
  };

  const handleDeleteFunnel = async (funnelId: string) => {
    try {
      await deleteFunnel(funnelId);
    } catch (error) {
      console.error("Failed to delete funnel:", error);
    }
  };

  const handleCreateFunnel = async (data: CreateFunnelRequest) => {
    await createFunnel(data);
    setIsCreateModalOpen(false);
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <FeatureLock
        feature="funnels"
        title="Unlock Conversion Funnels"
        description="Track user journeys and optimize conversion rates with advanced funnel analysis."
      >
        {/* Page Header */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FunnelIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Funnels</h1>
              </div>
              <p className="text-sm text-gray-600">
                Track conversion funnels to understand user journeys and optimize
                drop-off points.
              </p>
            </div>

            {selectedSiteId && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <PlusIcon className="w-4 h-4" />
                Create Funnel
              </button>
            )}
          </div>
        </div>

        {/* Site Selector */}
        {sites.length > 0 && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Site
            </label>
            <div className="flex flex-wrap gap-2">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => handleSiteChange(site.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedSiteId === site.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {site.site_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Sites */}
        {sites.length === 0 && (
          <div className="bg-white rounded-lg border-2 border-dashed border-blue-200 p-12 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <GlobeAltIcon className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No sites found
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              You need to add a site before you can create funnels. Get started by
              adding your first website.
            </p>
            <button
              onClick={() => router.push("/dashboard/my-sites")}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-semibold"
            >
              Go to My Sites
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* No Site Selected */}
        {sites.length > 0 && !selectedSiteId && (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12 text-center shadow-sm">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-50 rounded-full">
                <FunnelIcon className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Select a site
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Choose a site above to view and manage its conversion funnels.
            </p>
          </div>
        )}

        {/* Funnels Loading */}
        {selectedSiteId && funnelsLoading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Funnels Error */}
        {selectedSiteId && funnelsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {funnelsError.message}
          </div>
        )}

        {/* Funnels List */}
        {selectedSiteId && !funnelsLoading && !funnelsError && (
          <>
            {funnels.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-200 p-12 text-center shadow-sm">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-blue-50 rounded-full">
                    <FunnelIcon className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No funnels yet
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first funnel to start tracking user conversion
                  journeys.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-semibold"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Your First Funnel
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {funnels.map((funnel) => (
                  <FunnelCard
                    key={funnel.id}
                    funnel={funnel}
                    onView={handleViewFunnel}
                    onDelete={handleDeleteFunnel}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Modal */}
        {selectedSiteId && (
          <CreateFunnelModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateFunnel}
            siteId={selectedSiteId}
          />
        )}
      </FeatureLock>
    </div>
  );
}
