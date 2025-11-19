"use client";
import { useEffect, useRef, useState } from "react";
import { Replayer, unpack } from "rrweb";
import h337 from "heatmap.js";
import { createBrowserClient } from "@supabase/ssr";

interface DomHeatmapViewerProps {
  siteId: string;
  pagePath: string;
  deviceType: string;
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DomHeatmapViewer({
  siteId,
  pagePath,
  deviceType,
}: DomHeatmapViewerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotData, setSnapshotData] = useState<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);

  // 1. Fetch the DOM Snapshot JSON
  useEffect(() => {
    const fetchSnapshot = async () => {
      // Construct URL (matches your storage logic)
      const path = pagePath === "/" ? "homepage" : pagePath.replace(/^\//, "");
      const filePath = `${siteId}/${path}-${deviceType}.json`;

      const { data } = supabase.storage
        .from("screenshots")
        .getPublicUrl(filePath);

      const res = await fetch(data.publicUrl);
      if (res.ok) {
        const json = await res.json();
        setSnapshotData(json);
      }
    };
    fetchSnapshot();
  }, [siteId, pagePath, deviceType]);

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

  return (
    <div
      ref={iframeContainerRef}
      className="relative w-full h-[800px] overflow-auto border border-gray-300"
      // You might need to force the container width to match the deviceType
      // e.g. style={{ width: '1440px' }}
    />
  );
}
