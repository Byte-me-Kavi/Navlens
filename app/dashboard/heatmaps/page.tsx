"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import { 
  PresentationChartBarIcon,
  CursorArrowRaysIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// Heatmap type cards data
const heatmapTypes = [
  {
    id: "clicks",
    title: "Click Heatmaps",
    description: "See where users click and identify dead links or unexpected click targets.",
    icon: CursorArrowRaysIcon,
    color: "from-red-500 to-orange-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
  },
  {
    id: "scrolls",
    title: "Scroll Heatmaps", 
    description: "Analyze how far users scroll and where they drop off on your pages.",
    icon: ArrowTrendingDownIcon,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    id: "hover",
    title: "Move / Attention Heatmaps",
    description: "Track mouse movement patterns to understand where users focus their attention.",
    icon: EyeIcon,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-600",
  },
];

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

  // Get current site for display
  const currentSite = selectedSiteId ? getSiteById(selectedSiteId) : null;

  // Navigate to viewer with specific data type
  const openViewer = (dataType?: string) => {
    const url = dataType 
      ? `/dashboard/heatmaps/heatmap-viewer?type=${dataType}`
      : "/dashboard/heatmaps/heatmap-viewer";
    router.push(url);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-6 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <PresentationChartBarIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Heatmap Analytics</h1>
              <p className="text-gray-600 mt-1">
                Visualize user behavior with click, scroll, and movement heatmaps
              </p>
            </div>
          </div>
        </div>

        {/* No sites or no site selected states */}
        {sites.length === 0 ? (
          <NoSitesAvailable />
        ) : !selectedSiteId ? (
          <NoSiteSelected 
            featureName="heatmap analytics"
            description="Click and scroll patterns, mouse movements, and user interactions will appear here."
          />
        ) : (
          <>
            {/* Current Site Banner with View All Button */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Viewing heatmaps for</p>
                  <h2 className="text-xl font-bold text-gray-900">{currentSite?.site_name}</h2>
                  <p className="text-sm text-gray-500 font-mono">{currentSite?.domain}</p>
                </div>
                <button
                  onClick={() => openViewer()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <PresentationChartBarIcon className="w-5 h-5" />
                  View All Heatmaps
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Heatmap Type Cards */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a Heatmap Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {heatmapTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => openViewer(type.id)}
                      className={`group relative bg-white rounded-xl shadow-lg border-2 ${type.borderColor} p-6 text-left transition-all hover:shadow-xl hover:scale-105 hover:border-opacity-100`}
                    >
                      {/* Icon */}
                      <div className={`inline-flex p-3 ${type.bgColor} rounded-xl mb-4`}>
                        <Icon className={`w-8 h-8 ${type.iconColor}`} />
                      </div>
                      
                      {/* Title */}
                      <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {type.title}
                      </h4>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {type.description}
                      </p>

                      {/* Hover Arrow */}
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRightIcon className="w-5 h-5 text-blue-600" />
                      </div>

                      {/* Bottom Gradient Bar */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${type.color} rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6 mt-8">
              <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <span className="inline-flex p-1.5 bg-indigo-100 rounded-lg">
                  <EyeIcon className="w-4 h-4 text-indigo-600" />
                </span>
                Pro Tip: Smart Elements Overlay
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                When viewing <strong>Click Heatmaps</strong>, enable the <strong>Smart Elements</strong> toggle in the viewer settings to see clickable element outlines. 
                <span className="text-blue-600 font-medium"> Blue outlines</span> show interactive elements, while 
                <span className="text-red-600 font-medium"> red outlines</span> indicate clicks (clicks on interactive areas).
              </p>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500 mt-6">
              <p>
                Select a heatmap type above or click "View All Heatmaps" to explore all visualization options.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
