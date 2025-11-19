"use client";
import { useEffect, useRef, useState } from "react";
import { Replayer, unpack } from "rrweb";
import h337 from "heatmap.js";

interface DomHeatmapViewerProps {
  siteId: string;
  pagePath: string;
  deviceType: string;
}

interface ClickData {
  x: number;
  y: number;
  value: number;
}

export default function DomHeatmapViewer({
  siteId,
  pagePath,
  deviceType,
}: DomHeatmapViewerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotData, setSnapshotData] = useState<unknown>(null);
  const [clickData, setClickData] = useState<ClickData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);

  // 1. Fetch the DOM Snapshot JSON via API
  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(
          `/api/get-snapshot?siteId=${encodeURIComponent(
            siteId
          )}&pagePath=${encodeURIComponent(
            pagePath
          )}&deviceType=${encodeURIComponent(deviceType)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.warn("Snapshot not found for:", {
              siteId,
              pagePath,
              deviceType,
            });
            return;
          }
          throw new Error(`Failed to fetch snapshot: ${response.status}`);
        }

        const json = await response.json();
        setSnapshotData(json);
      } catch (error) {
        console.error("Error fetching snapshot:", error);
      }
    };

    fetchSnapshot();
  }, [siteId, pagePath, deviceType]);

  // 2. Fetch Click Data via API
  useEffect(() => {
    const fetchClickData = async () => {
      try {
        const response = await fetch(
          `/api/heatmap-clicks?siteId=${encodeURIComponent(
            siteId
          )}&pagePath=${encodeURIComponent(
            pagePath
          )}&deviceType=${encodeURIComponent(deviceType)}`
        );

        if (!response.ok) {
          console.error("Failed to fetch click data:", response.status);
          return;
        }

        const data = await response.json();
        setClickData(data.clicks || []);
      } catch (error) {
        console.error("Error fetching click data:", error);
      }
    };

    fetchClickData();
  }, [siteId, pagePath, deviceType]);

  // 3. Rebuild the DOM with rrweb Replayer
  useEffect(() => {
    if (!snapshotData || !iframeContainerRef.current) return;

    // Clear previous content
    iframeContainerRef.current.innerHTML = "";

    // Create full snapshot event for rrweb
    const events = [
      {
        type: 2, // Full snapshot event
        data: snapshotData,
        timestamp: Date.now(),
      },
    ];

    // Initialize Replayer - it reconstructs the HTML at 1:1 scale
    const replayer = new Replayer(events, {
      root: iframeContainerRef.current,
      unpackFn: unpack, // Handles compression if used
      // Disable live mode since we want static reconstruction
      liveMode: false,
      // Ensure 1:1 scaling
      speed: 1,
    });

    // Play the single frame to render it
    replayer.play();

    // Pause immediately so it stays static
    setTimeout(() => replayer.pause(), 10);

    // 4. Initialize Heatmap overlay on the reconstructed DOM
    const instance = h337.create({
      container: iframeContainerRef.current, // Draw ON TOP of the rebuilt HTML
      radius: 30,
      maxOpacity: 0.6,
    });
    setHeatmapInstance(instance);
  }, [snapshotData]);

  // 5. Render Heatmap Data
  useEffect(() => {
    if (!heatmapInstance || clickData.length === 0) return;

    // Convert click data to heatmap format
    const heatmapData = {
      max: Math.max(...clickData.map((d) => d.value)),
      data: clickData.map((point) => ({
        x: point.x,
        y: point.y,
        value: point.value,
      })),
    };

    heatmapInstance.setData(heatmapData);
  }, [heatmapInstance, clickData]);

  return (
    <div
      ref={iframeContainerRef}
      className="relative w-full h-[800px] overflow-auto border border-gray-300"
      // The iframe will be created inside this container by rrweb
      // Heatmap overlay will be positioned absolutely on top
    />
  );
}
