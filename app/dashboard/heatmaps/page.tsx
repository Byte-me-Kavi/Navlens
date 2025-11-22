"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import {
  PresentationChartBarIcon,
  GlobeAltIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface Site {
  id: string;
  created_at: string;
  site_name: string;
  domain: string;
  api_key: string;
  user_id: string;
}

export default function HeatmapsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedSiteId } = useSite();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const { data: sites, error } = await supabase
          .from("sites")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching sites:", error);
          setError("Failed to load sites");
          toast.error("Failed to load sites");
        } else {
          setSites(sites || []);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("An unexpected error occurred");
        toast.error("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [supabase]);

  const handleViewHeatmap = (siteId: string) => {
    setSelectedSiteId(siteId);
    router.push("/dashboard/heatmaps/heatmap-viewer");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <PresentationChartBarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Heatmaps</h1>
        </div>
        <p className="text-sm text-gray-600">
          Select a site to view its heatmap data and user interactions.
        </p>
      </div>

      {sites.length === 0 ? (
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
            You need to add a site before you can view heatmaps. Get started by
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="group bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => handleViewHeatmap(site.id)}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors shrink-0">
                  <GlobeAltIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                    {site.site_name}
                  </h3>
                  <a
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 transition-colors text-xs font-medium block truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {site.domain}
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Added {new Date(site.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-1.5 text-blue-600 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                  <span>View</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
