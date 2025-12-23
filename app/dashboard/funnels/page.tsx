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
  DeleteFunnelModal,
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
import { toast } from "react-hot-toast";

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
  const [funnelToDelete, setFunnelToDelete] = useState<{id: string, name: string} | null>(null);

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

  const _handleViewFunnel = (funnelId: string) => {
    router.push(`/dashboard/funnels/${funnelId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!funnelToDelete) return;
    
    try {
      await deleteFunnel(funnelToDelete.id);
      toast.success("Funnel deleted successfully");
      setFunnelToDelete(null);
      // Hard refresh to ensure deleted item is gone from all caches
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete funnel:", error);
      toast.error("Failed to delete funnel");
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <FeatureLock
        feature="funnels"
        title="Unlock Conversion Funnels"
        description="Track user journeys and optimize conversion rates with advanced funnel analysis."
      >
        {/* Page Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <FunnelIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Funnels</h1>
             </div>
            <p className="text-gray-600 text-base">
              Track conversion funnels to understand user journeys and optimize
              drop-off points.
            </p>
          </div>

          {selectedSiteId && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Create Funnel
            </button>
          )}
        </div>

        {/* Introduction */}
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 mb-2">Why use Funnels?</h3>
           <p className="text-gray-600 leading-relaxed text-sm md:text-base">
             Funnels help you visualize how users guide through a specific path on your website. 
             By defining key steps (like &quot;Product Page&quot; &rarr; &quot;Cart&quot; &rarr; &quot;Checkout&quot;), you can identify exactly 
             where users are dropping off and discover opportunities to improve your conversion rates.
           </p>
        </div>

        {/* Site Selector */}
        {sites.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Site
            </label>
            <div className="flex flex-wrap gap-2">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => handleSiteChange(site.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedSiteId === site.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
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
          <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-100 p-12 text-center shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-indigo-50 rounded-full ring-8 ring-indigo-50/50">
                <GlobeAltIcon className="w-12 h-12 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No sites found
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You need to add a site before you can create funnels. Get started by
              adding your first website.
            </p>
            <button
              onClick={() => router.push("/dashboard/my-sites")}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Go to My Sites
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* No Site Selected */}
        {sites.length > 0 && !selectedSiteId && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gray-50 rounded-full">
                <FunnelIcon className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Select a site
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Choose a site above to view and manage its conversion funnels.
            </p>
          </div>
        )}

        {/* Funnels Loading */}
        {selectedSiteId && funnelsLoading && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {/* Funnels Error */}
        {selectedSiteId && funnelsError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700 flex items-center gap-3">
             <div className="p-2 bg-red-100 rounded-full">
               <span className="text-xl">⚠️</span>
             </div>
             <div>
               <h3 className="font-bold">Error Loading Funnels</h3>
               <p className="text-sm">{funnelsError.message}</p>
             </div>
          </div>
        )}

        {/* Funnels List */}
        {selectedSiteId && !funnelsLoading && !funnelsError && (
          <>
            {funnels.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-100 p-16 text-center shadow-sm">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-indigo-50 rounded-full ring-8 ring-indigo-50/50">
                    <FunnelIcon className="w-12 h-12 text-indigo-400" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No funnels yet
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Create your first conversion funnel to start tracking user
                  journeys.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Funnel
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {funnels.map((funnel) => (
                  <div
                    key={funnel.id}
                    onClick={() => router.push(`/dashboard/funnels/${funnel.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden cursor-pointer"
                  >
                     <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button 
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             setFunnelToDelete({ id: funnel.id, name: funnel.name });
                           }}
                           className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                         >
                            <TrashIcon className="w-5 h-5" />
                         </button>
                     </div>

                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                        <FunnelIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {funnel.name}
                    </h3>
                    
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between text-sm">
                           <span className="text-gray-500">Steps</span>
                           <span className="font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                             {funnel.steps.length} steps
                           </span>
                        </div>
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-gray-500">Created</span>
                           <span className="text-gray-900">
                             {new Date(funnel.created_at).toLocaleDateString()}
                           </span>
                        </div>
                    </div>

                    <div
                      className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 group-hover:shadow-sm"
                    >
                      View Analysis
                      <ArrowRightIcon className="w-4 h-4" />
                    </div>
                  </div>
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

        {/* Delete Modal */}
        {funnelToDelete && (
          <DeleteFunnelModal
            isOpen={!!funnelToDelete}
            onClose={() => setFunnelToDelete(null)}
            onDelete={handleDeleteConfirm}
            funnelName={funnelToDelete.name}
          />
        )}
      </FeatureLock>
    </div>
  );
}
