"use client";
import { useEffect, useRef, useState } from "react";
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
  const [clickData, setClickData] = useState<ClickData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);
  const [siteUrl, setSiteUrl] = useState<string>("");

  // Fetch site URL
  useEffect(() => {
    const fetchSiteUrl = async () => {
      try {
        const response = await fetch("/api/site-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        });
        const data = await response.json();
        if (data.domain) {
          // Ensure the domain has https://
          const url = data.domain.startsWith("http")
            ? data.domain
            : `https://${data.domain}`;
          setSiteUrl(url);
        } else {
          // Fallback to a test URL for development
          console.warn("No domain found, using fallback URL");
          setSiteUrl("https://navlens-rho.vercel.app");
        }
      } catch (error) {
        console.error("Failed to fetch site details:", error);
        // Fallback to a test URL for development
        setSiteUrl("https://navlens-rho.vercel.app");
      }
    };

    if (siteId) {
      fetchSiteUrl();
    }
  }, [siteId]);

  // 1. Fetch Click Data via API or use mock data
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
          // Use mock data if API fails
          setClickData(generateMockClickData());
          return;
        }

        const data = await response.json();
        setClickData(data.clicks || generateMockClickData());
      } catch (error) {
        console.error("Error fetching click data:", error);
        // Use mock data on error
        setClickData(generateMockClickData());
      }
    };

    fetchClickData();
  }, [siteId, pagePath, deviceType]);

  // Generate mock click data
  const generateMockClickData = (): ClickData[] => {
    const mockClicks: ClickData[] = [];
    const numPoints = 50 + Math.random() * 50; // 50-100 points

    for (let i = 0; i < numPoints; i++) {
      // Generate random positions across the page
      // Bias towards common click areas: navigation, buttons, links
      let x, y;

      const rand = Math.random();
      if (rand < 0.2) {
        // Top navigation/header area
        x = Math.random() * 1200; // Assuming desktop width
        y = 20 + Math.random() * 80;
      } else if (rand < 0.5) {
        // Left sidebar or navigation
        x = 20 + Math.random() * 200;
        y = 100 + Math.random() * 600;
      } else if (rand < 0.8) {
        // Main content area
        x = 250 + Math.random() * 700;
        y = 150 + Math.random() * 500;
      } else {
        // Footer or bottom area
        x = Math.random() * 1200;
        y = 650 + Math.random() * 150;
      }

      // Adjust for device type
      if (deviceType === "mobile") {
        x = x * 0.8; // Narrower on mobile
        y = y * 0.9 + 50; // More bottom-focused
      } else if (deviceType === "tablet") {
        x = x * 0.9;
        y = y * 0.95;
      }

      mockClicks.push({
        x: Math.round(x),
        y: Math.round(y),
        value: Math.floor(Math.random() * 20) + 1, // Values from 1-20
      });
    }

    return mockClicks;
  };

  // 2. Load the page in iframe and overlay heatmap
  useEffect(() => {
    if (!iframeContainerRef.current || !siteUrl) return;

    // Clear previous content
    iframeContainerRef.current.innerHTML = "";

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.src = `${siteUrl}${pagePath}`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.scrolling = "yes";
    iframe.sandbox = "allow-scripts allow-same-origin";

    iframe.onload = () => {
      // Initialize Heatmap overlay on the iframe
      const instance = h337.create({
        container: iframeContainerRef.current!, // Draw ON TOP of the iframe
        radius: 50,
        maxOpacity: 0.8,
        blur: 0.75,
      });
      setHeatmapInstance(instance);
    };

    iframeContainerRef.current.appendChild(iframe);
  }, [pagePath, siteUrl]);

  // 3. Render Heatmap Data
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
    <div className="relative w-full h-full">
      {!siteUrl ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading site details...</div>
        </div>
      ) : (
        <div
          ref={iframeContainerRef}
          className="relative w-full h-screen overflow-auto border border-gray-300"
        />
      )}
    </div>
  );
}
