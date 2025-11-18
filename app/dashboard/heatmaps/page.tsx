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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <PresentationChartBarIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Heatmaps</h1>
        </div>
        <p className="text-lg text-gray-600">
          Select a site to view its heatmap data and user interactions.
        </p>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-12">
          <GlobeAltIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No sites found
          </h3>
          <p className="text-gray-600 mb-6">
            You need to add a site before you can view heatmaps.
          </p>
          <button
            onClick={() => router.push("/dashboard/my-sites")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
          >
            Go to My Sites
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {site.site_name}
                  </h3>
                  <a
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium break-all"
                  >
                    {site.domain}
                  </a>
                </div>
                <GlobeAltIcon className="w-6 h-6 text-gray-400 shrink-0 ml-2" />
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Added {new Date(site.created_at).toLocaleDateString()}
              </p>

              <button
                onClick={() => handleViewHeatmap(site.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <PresentationChartBarIcon className="w-4 h-4" />
                View Heatmap
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
