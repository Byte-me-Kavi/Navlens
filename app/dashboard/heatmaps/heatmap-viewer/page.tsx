"use client";
import { useEffect, useState } from "react";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import DomHeatmapViewer from "@/components/DomHeatmapViewer";

export default function HeatmapViewerPage() {
  const { selectedSiteId: siteId } = useSite();
  const [selectedPage, setSelectedPage] = useState("/");
  const [selectedDevice, setSelectedDevice] = useState("desktop");
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available pages
  useEffect(() => {
    if (!siteId) return;

    const fetchPages = async () => {
      try {
        const response = await fetch("/api/get-pages-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        });
        const data = await response.json();
        setAvailablePages(data.pages || []);
      } catch (error) {
        console.error("Failed to fetch pages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading heatmap viewer..." />
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-gray-500">
          <p>No site selected. Please select a site from the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Heatmap Viewer</h1>
        {siteId && <p className="text-gray-600">Site: {siteId}</p>}
      </div>

      {/* Controls */}
      <div className="mb-4 flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Page
          </label>
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {availablePages.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Device
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>
      </div>

      {/* Heatmap Viewer Component */}
      <div className="flex-1">
        <DomHeatmapViewer
          siteId={siteId}
          pagePath={selectedPage}
          deviceType={selectedDevice}
        />
      </div>
    </div>
  );
}
