"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { HeatmapViewer, HeatmapSettings } from "@/features/heatmap";

export default function HeatmapViewerPage() {
  const router = useRouter();
  const { selectedSiteId: siteId } = useSite();
  const [selectedPage, setSelectedPage] = useState("/");
  const [selectedDevice, setSelectedDevice] = useState<
    "desktop" | "mobile" | "tablet"
  >("desktop");
  const [selectedDataType, setSelectedDataType] = useState<
    "clicks" | "heatmap" | "both"
  >("both");
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showElements, setShowElements] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAllViewports, setShowAllViewports] = useState(false);

  // Redirect to dashboard if site context is lost (page refresh scenario)
  useEffect(() => {
    if (!siteId) {
      // Check if this is a page refresh by looking at sessionStorage
      const hasVisitedBefore = sessionStorage.getItem("heatmap-viewer-visited");

      if (hasVisitedBefore) {
        // This is likely a refresh - redirect to dashboard
        console.log("Site context lost, redirecting to dashboard");
        router.push("/dashboard/heatmaps");
        return;
      }

      // First visit - wait a bit to see if context loads
      const timeout = setTimeout(() => {
        if (!siteId) {
          console.log(
            "Site context not available after timeout, redirecting to dashboard"
          );
          router.push("/dashboard/heatmaps");
        }
      }, 3000); // 3 second timeout

      return () => clearTimeout(timeout);
    } else {
      // Mark that we've visited this page
      sessionStorage.setItem("heatmap-viewer-visited", "true");
    }
  }, [siteId, router]);

  // Cleanup sessionStorage on unmount
  useEffect(() => {
    return () => {
      // Clear the visited flag when component unmounts properly
      sessionStorage.removeItem("heatmap-viewer-visited");
    };
  }, []);

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

  if (loading || !siteId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading heatmap viewer..." />
      </div>
    );
  }

  return (
    <div className="h-screen relative bg-slate-50 dark:bg-slate-900">
      {/* Full Screen Heatmap Viewer */}
      <HeatmapViewer
        siteId={siteId}
        pagePath={selectedPage}
        deviceType={selectedDevice}
        dataType={selectedDataType}
        showElements={showElements}
        showHeatmap={showHeatmap}
        showAllViewports={showAllViewports}
        onViewportModeChange={(showAll) => setShowAllViewports(showAll)}
      />

      {/* Heatmap Settings Sidebar Component - Overlay */}
      <HeatmapSettings
        availablePages={availablePages}
        selectedPage={selectedPage}
        onPageChange={setSelectedPage}
        selectedDevice={selectedDevice}
        onDeviceChange={setSelectedDevice}
        selectedDataType={selectedDataType}
        onDataTypeChange={setSelectedDataType}
        showElements={showElements}
        onShowElementsChange={setShowElements}
        showHeatmap={showHeatmap}
        onShowHeatmapChange={setShowHeatmap}
        showAllViewports={showAllViewports}
        onShowAllViewportsChange={setShowAllViewports}
        siteId={siteId}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
    </div>
  );
}
