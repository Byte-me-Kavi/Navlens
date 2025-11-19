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

// Type definitions for rrweb data
interface RrwebEvent {
  type: number;
  data?: Record<string, unknown>;
  timestamp?: number;
}

interface RrwebRecord {
  events: RrwebEvent[] | string;
  // Add other fields as needed
}

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

        const { data, error } = await supabase.storage
          .from("snapshots")
          .download(filePath);

        if (error) {
          console.error("[Heatmap Viewer] Error downloading snapshot:", error);
          return;
        }

        // Convert blob to JSON
        const text = await data.text();
        const json = JSON.parse(text);
        setSnapshotData(json);
        console.log(
          "[Heatmap Viewer] Snapshot loaded successfully from:",
          filePath
        );
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

    try {
      // Clear previous
      iframeContainerRef.current.innerHTML = "";

      // Create events for rrweb
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let events: any[] = [];

      if (Array.isArray(snapshotData)) {
        // If it's already an array of events, use it directly
        events = snapshotData;
      } else if (snapshotData && typeof snapshotData === "object") {
        // If it's a single snapshot object, wrap it as a full snapshot event
        // But first validate that it has the required structure
        if ("childNodes" in snapshotData || "type" in snapshotData) {
          events = [
            {
              type: 4, // Meta event - required for rrweb
              data: {
                href: window.location.href,
                width: window.innerWidth,
                height: window.innerHeight,
              },
              timestamp: Date.now() - 100,
            },
            {
              type: 2, // Full snapshot event
              data: snapshotData,
              timestamp: Date.now(),
            },
          ];
        } else {
          console.warn(
            "[Heatmap Viewer] Snapshot data does not appear to be valid rrweb format"
          );
          console.log(
            "[Heatmap Viewer] Snapshot structure:",
            Object.keys(snapshotData).slice(0, 20)
          );
          return;
        }
      }

      console.log(
        "[Heatmap Viewer] Events:",
        events.length,
        "Event types:",
        events.map((e: RrwebEvent) => e?.type || "unknown")
      );

      if (events.length < 1) {
        console.warn("[Heatmap Viewer] No valid events for Replayer");
        return;
      }

      console.log(
        "[Heatmap Viewer] Initializing Replayer with first event type:",
        events[0]?.type
      );

      // Initialize Replayer (it reconstructs the HTML)
      const replayer = new Replayer(events, {
        root: iframeContainerRef.current,
        unpackFn: unpack, // Handles compression if used
        triggerFocus: false,
      });

      // "Play" the single frame to render it
      replayer.play();
      // Pause immediately so it stays static
      setTimeout(() => replayer.pause(), 50);

      console.log("[Heatmap Viewer] DOM rebuilt successfully");

      // 3. Initialize Heatmap on top of the Rebuilt DOM
      const instance = h337.create({
        container: iframeContainerRef.current, // Draw ON TOP of the rebuilt HTML
        radius: 30,
        maxOpacity: 0.6,
      });
      setHeatmapInstance(instance);
    } catch (error) {
      console.error("[Heatmap Viewer] Error rebuilding DOM:", error);
      if (error instanceof Error) {
        console.error("[Heatmap Viewer] Stack:", error.stack);
      }
      console.log("[Heatmap Viewer] Snapshot analysis:", {
        type: typeof snapshotData,
        isArray: Array.isArray(snapshotData),
        firstItemType:
          Array.isArray(snapshotData) && snapshotData.length > 0
            ? typeof snapshotData[0]
            : "N/A",
        keys:
          snapshotData &&
          typeof snapshotData === "object" &&
          !Array.isArray(snapshotData)
            ? Object.keys(snapshotData).slice(0, 10)
            : null,
      });
    }
  }, [snapshotData]);

  // 4. Fetch & Render Heatmap Data from rrweb events
  useEffect(() => {
    if (!heatmapInstance || !siteId || !selectedPage) return;

    const fetchHeatmapData = async () => {
      try {
        // Fetch rrweb events for this page
        const { data: rrwebData, error } = await supabase
          .from("rrweb_events")
          .select("events")
          .eq("site_id", siteId)
          .eq("page_path", selectedPage)
          .order("timestamp", { ascending: false })
          .limit(10); // Get recent sessions

        if (error) {
          console.error("[Heatmap Viewer] Error fetching rrweb events:", error);
          return;
        }

        // Extract mouse positions and clicks from rrweb events
        const heatmapPoints: Array<{ x: number; y: number; value: number }> =
          [];

        rrwebData?.forEach((record: RrwebRecord) => {
          const events =
            typeof record.events === "string"
              ? JSON.parse(record.events)
              : record.events;

          events.forEach((event: RrwebEvent) => {
            if (event.type === 5 && event.data) {
              // Mouse events
              // Mouse movements have positions
              if (event.data.x !== undefined && event.data.y !== undefined) {
                heatmapPoints.push({
                  x: event.data.x as number,
                  y: event.data.y as number,
                  value: 1, // Low intensity for movements
                });
              }
            } else if (
              event.type === 3 &&
              event.data &&
              (event.data.source as number) === 1
            ) {
              // Click events
              // Mouse interactions (clicks)
              if (event.data.x !== undefined && event.data.y !== undefined) {
                heatmapPoints.push({
                  x: event.data.x as number,
                  y: event.data.y as number,
                  value: 10, // High intensity for clicks
                });
              }
            }
          });
        });

        console.log(
          `[Heatmap Viewer] Found ${heatmapPoints.length} interaction points`
        );

        // Apply heatmap data
        if (heatmapPoints.length > 0) {
          heatmapInstance.setData({
            max: 10,
            data: heatmapPoints,
          });
        }
      } catch (error) {
        console.error("[Heatmap Viewer] Error processing heatmap data:", error);
      }
    };

    fetchHeatmapData();
  }, [heatmapInstance, siteId, selectedPage]);

  const recaptureSnapshot = async () => {
    if (!siteId || !selectedPage || !selectedDevice) return;

    setLoading(true);
    try {
      // For recapture, we need to trigger snapshot capture on the actual site
      // Since we can't do that from here, we'll show a message
      alert(
        "To recapture the snapshot, please visit the actual page and refresh. The tracker will automatically capture a new snapshot."
      );

      // Alternatively, we could try to refresh the existing data
      // For now, just reload the current snapshot
      const path =
        selectedPage === "/" ? "homepage" : selectedPage.replace(/\//g, "_");
      const filePath = `${siteId}/${selectedDevice}/${path}.json`;
      const { data, error } = await supabase.storage
        .from("snapshots")
        .download(filePath);

      if (error) {
        console.error("[Heatmap Viewer] Error downloading snapshot:", error);
        return;
      }

      // Convert blob to JSON
      const text = await data.text();
      const json = JSON.parse(text);
      setSnapshotData(json);
      console.log("[Heatmap Viewer] Refreshed snapshot data");
    } catch (error) {
      console.error("Failed to refresh snapshot:", error);
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
