"use client";
import { useEffect, useRef, useState } from "react";
import { Replayer, unpack } from "rrweb";
import h337 from "heatmap.js";
import { createBrowserClient } from "@supabase/ssr";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DomHeatmapViewer() {
  const { selectedSiteId: siteId } = useSite();
  const [selectedPage, setSelectedPage] = useState("/");
  const [selectedDevice, setSelectedDevice] = useState("desktop");
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotData, setSnapshotData] = useState<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);

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
      }
    };

    fetchPages();
  }, [siteId]);

  // 1. Fetch the DOM Snapshot JSON
  useEffect(() => {
    if (!siteId || !selectedPage || !selectedDevice) {
      setLoading(false);
      return;
    }

    const fetchSnapshot = async () => {
      setLoading(true);
      try {
        // Construct URL (matches API storage path: site_id/device_type/normalizedPath.json)
        const path =
          selectedPage === "/" ? "homepage" : selectedPage.replace(/\//g, "_");
        const filePath = `${siteId}/${selectedDevice}/${path}.json`;

        const { data } = supabase.storage
          .from("snapshots")
          .getPublicUrl(filePath);

        const res = await fetch(data.publicUrl);
        if (res.ok) {
          const json = await res.json();
          setSnapshotData(json);
          console.log(
            "[Heatmap Viewer] Snapshot loaded successfully from:",
            filePath
          );
        } else {
          console.warn(
            "[Heatmap Viewer] Snapshot not found at:",
            filePath,
            "Status:",
            res.status
          );
        }
      } catch (err) {
        console.error("[Heatmap Viewer] Error fetching snapshot:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSnapshot();
  }, [siteId, selectedPage, selectedDevice]);

  // 2. Rebuild the DOM (The Magic Step)
  useEffect(() => {
    if (!snapshotData || !iframeContainerRef.current) return;

    // Clear previous
    iframeContainerRef.current.innerHTML = "";

    // Create full snapshot event for rrweb
    const events = [
      {
        type: 2, // Full snapshot event
        data: snapshotData,
        timestamp: Date.now(),
      },
    ];

    // Initialize Replayer (it reconstructs the HTML)
    const replayer = new Replayer(events, {
      root: iframeContainerRef.current,
      unpackFn: unpack, // Handles compression if used
    });

    // "Play" the single frame to render it
    replayer.play();
    // Pause immediately so it stays static
    setTimeout(() => replayer.pause(), 10);

    // 3. Initialize Heatmap on top of the Rebuilt DOM
    const instance = h337.create({
      container: iframeContainerRef.current, // Draw ON TOP of the rebuilt HTML
      radius: 30,
      maxOpacity: 0.6,
    });
    setHeatmapInstance(instance);
  }, [snapshotData]);

  // 4. Fetch & Render Heatmap Data (Same as your old logic)
  useEffect(() => {
    if (!heatmapInstance) return;
    // ... fetch clickhouse data ...
    // ... heatmapInstance.setData(...) ...

    // NOTE: You don't need complex scaling anymore!
    // The Replayer recreates the page at the original size.
    // x=500 is x=500.
  }, [heatmapInstance]);

  const recaptureSnapshot = async () => {
    if (!siteId || !selectedPage || !selectedDevice) return;

    setLoading(true);
    try {
      const response = await fetch("/api/generate-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          pagePath: selectedPage,
          deviceType: selectedDevice,
        }),
      });
      if (response.ok) {
        // Refresh the snapshot data
        const path =
          selectedPage === "/" ? "homepage" : selectedPage.replace(/\//g, "_");
        const filePath = `${siteId}/${selectedDevice}/${path}.json`;
        const { data } = supabase.storage
          .from("snapshots")
          .getPublicUrl(filePath);
        const res = await fetch(data.publicUrl);
        if (res.ok) {
          const json = await res.json();
          setSnapshotData(json);
        }
      }
    } catch (error) {
      console.error("Failed to recapture snapshot:", error);
    } finally {
      setLoading(false);
    }
  };

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

        <div className="flex items-end">
          <button
            onClick={recaptureSnapshot}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Recapture Snapshot
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner message="Loading heatmap..." />
        </div>
      )}

      {!loading && !siteId && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p>
              No site selected. Please select a site from the heatmaps page.
            </p>
          </div>
        </div>
      )}

      {!loading && siteId && (
        <div
          ref={iframeContainerRef}
          className="relative w-full flex-1 overflow-auto border border-gray-300 bg-white"
          style={{ minHeight: "600px" }}
        />
      )}
    </div>
  );
}
