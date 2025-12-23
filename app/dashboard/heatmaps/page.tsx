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
  GlobeAltIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Heatmap type cards data - using consistent indigo theme
const heatmapTypes = [
  {
    id: "clicks",
    title: "Click Heatmaps",
    description: "See where users click and identify dead links or unexpected click targets.",
    icon: CursorArrowRaysIcon,
    bgColor: "bg-rose-50",
    iconColor: "text-rose-600",
    hoverBorder: "hover:border-rose-300",
    accentColor: "rose",
  },
  {
    id: "scrolls",
    title: "Scroll Heatmaps", 
    description: "Analyze how far users scroll and where they drop off on your pages.",
    icon: ArrowTrendingDownIcon,
    bgColor: "bg-sky-50",
    iconColor: "text-sky-600",
    hoverBorder: "hover:border-sky-300",
    accentColor: "sky",
  },
  {
    id: "hover",
    title: "Move / Attention Heatmaps",
    description: "Track mouse movement patterns to understand where users focus their attention.",
    icon: EyeIcon,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
    hoverBorder: "hover:border-violet-300",
    accentColor: "violet",
  },
  {
    id: "elements",
    title: "Element Analysis & AI",
    description: "Deep dive into interactive elements with tech specs and AI optimization insights.",
    icon: SparklesIcon,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
    hoverBorder: "hover:border-indigo-300",
    accentColor: "indigo",
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
    let url = "/dashboard/heatmaps/heatmap-viewer";
    
    if (dataType === 'elements') {
      url += "?type=elements&showElements=true";
    } else if (dataType) {
      url += `?type=${dataType}`;
    }
    
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
    <div className="min-h-screen px-4 py-6 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <PresentationChartBarIcon className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Heatmap Analytics</h1>
              <p className="text-gray-500 text-sm mt-0.5">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <GlobeAltIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5 uppercase tracking-wide font-medium">Viewing heatmaps for</p>
                    <h2 className="text-lg font-bold text-gray-900">{currentSite?.site_name}</h2>
                    <p className="text-sm text-indigo-600 font-medium">{currentSite?.domain}</p>
                  </div>
                </div>
                <button
                  onClick={() => openViewer()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <PresentationChartBarIcon className="w-5 h-5" />
                  View All Heatmaps
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Heatmap Type Cards */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Choose a Heatmap Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {heatmapTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => openViewer(type.id)}
                      className={`group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${type.hoverBorder}`}
                    >
                      {/* Icon */}
                      <div className={`inline-flex p-3 ${type.bgColor} rounded-xl mb-4`}>
                        <Icon className={`w-7 h-7 ${type.iconColor}`} />
                      </div>
                      
                      {/* Title */}
                      <h4 className={`text-lg font-bold text-gray-900 mb-2 group-hover:${type.iconColor} transition-colors`}>
                        {type.title}
                      </h4>
                      
                      {/* Description */}
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {type.description}
                      </p>

                      {/* Hover Arrow */}
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRightIcon className={`w-5 h-5 ${type.iconColor}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5 mt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 mb-1">
                    Pro Tip: Smart Elements Overlay
                  </h4>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    When viewing <strong>Click Heatmaps</strong>, enable the <strong>Smart Elements</strong> toggle to see clickable element outlines. 
                    <span className="text-sky-600 font-semibold"> Blue</span> = interactive elements, 
                    <span className="text-rose-600 font-semibold"> Red</span> = dead clicks.
                  </p>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center text-xs text-gray-400 mt-6">
              <p>
                Select a heatmap type above or click &quot;View All Heatmaps&quot; to explore all visualization options.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
