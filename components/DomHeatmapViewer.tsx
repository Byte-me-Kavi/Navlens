"use client";
import { useEffect, useRef, useState } from "react";
import h337 from "heatmap.js";
import * as rrwebSnapshot from "rrweb-snapshot";
import { ElementClick } from "@/types/smart-map";

// Type declarations for rrweb-snapshot global
declare global {
  interface Window {
    rrwebSnapshot: {
      buildNodeWithSN: (
        node: any,
        options: {
          doc: Document;
          hackCss: boolean;
          skipChild: boolean;
          newlyAddedElement: boolean;
        }
      ) => Element | null;
    };
  }
}

interface DomHeatmapViewerProps {
  siteId: string;
  pagePath: string;
  deviceType: string;
  dataType: string;
}

interface ClickData {
  x: number;
  y: number;
  value: number;
}

interface SnapshotWithOrigin {
  snapshot?: unknown;
  styles?: unknown[];
  origin?: string;
  [key: string]: unknown;
}

interface StyleObject {
  type: string;
  content?: string;
  href?: string;
  source?: string;
}

interface SnapshotNode {
  type: number;
  tagName?: string;
  attributes?: Record<string, unknown>;
  childNodes?: SnapshotNode[];
  textContent?: string;
}

export default function DomHeatmapViewer({
  siteId,
  pagePath,
  deviceType,
  dataType,
}: DomHeatmapViewerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotData, setSnapshotData] = useState<unknown>(null);
  const [styles, setStyles] = useState<unknown[]>([]);
  const [origin, setOrigin] = useState<string>("");
  const [clickData, setClickData] = useState<ClickData[]>([]);
  const [elementClicks, setElementClicks] = useState<ElementClick[]>([]);
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

        console.log("=== Snapshot Retrieved from API ===");
        console.log("Response keys:", Object.keys(json));
        console.log("Has snapshot:", !!json.snapshot);
        console.log("Has styles:", !!json.styles);
        console.log("Styles length:", json.styles?.length);
        console.log("Has origin:", !!json.origin);
        console.log("Origin value:", json.origin);

        // Handle both old format (direct snapshot) and new format (snapshot + styles + origin)
        if (json.snapshot) {
          setSnapshotData(json.snapshot);
          setStyles(json.styles || []);
          setOrigin(json.origin || window.location.origin);
          console.log("? Using new format (snapshot + styles + origin)");
        } else {
          setSnapshotData(json);
          setStyles([]);
          setOrigin(window.location.origin);
          console.log("?? Using old format (direct snapshot, no styles)");
        }
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
        // Fetch element clicks data
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - 30 * 24 * 60 * 60 * 1000
        ); // 30 days ago

        const elementResponse = await fetch("/api/element-clicks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            siteId,
            pagePath,
            deviceType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        });

        if (!elementResponse.ok) {
          console.error(
            "Failed to fetch element click data:",
            elementResponse.status
          );
          setElementClicks([]);
        } else {
          const elementData = await elementResponse.json();
          console.log(
            "Fetched element click data:",
            elementData.length || 0,
            "elements"
          );
          setElementClicks(elementData || []);
        }

        // Fetch heatmap click points
        const heatmapResponse = await fetch(
          `/api/heatmap-clicks?siteId=${encodeURIComponent(
            siteId
          )}&pagePath=${encodeURIComponent(
            pagePath
          )}&deviceType=${encodeURIComponent(deviceType)}`
        );

        if (!heatmapResponse.ok) {
          console.error(
            "Failed to fetch heatmap click data:",
            heatmapResponse.status
          );
          setClickData([]);
        } else {
          const heatmapData = await heatmapResponse.json();
          console.log(
            "Fetched heatmap click data:",
            heatmapData.clicks?.length || 0,
            "points"
          );
          setClickData(heatmapData.clicks || []);
        }
      } catch (error) {
        console.error("Error fetching click data:", error);
        setElementClicks([]);
        setClickData([]);
      }
    };

    fetchClickData();
  }, [siteId, pagePath, deviceType]);

  // 3. Rebuild the DOM (Corrected - prevents HierarchyRequestError)
  useEffect(() => {
    if (!snapshotData || !iframeContainerRef.current) return;

    console.log("=== Starting DOM Rebuild ===");
    const container = iframeContainerRef.current;
    container.innerHTML = "";

    // 1. Create Iframe Wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position: relative; width: 100%; height: 100%;";
    container.appendChild(wrapper);

    // 2. Create Iframe
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "width: 100%; height: 100%; border: none;";
    // Strict sandbox: allow-same-origin only. NO allow-scripts.
    iframe.setAttribute("sandbox", "allow-same-origin");
    wrapper.appendChild(iframe);

    // 3. Rebuild Content
    setTimeout(() => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      try {
        console.log("Rebuilding with rrweb...");

        // Create a temporary document for rebuilding (avoid circular references)
        const rebuildDoc = document.implementation.createHTMLDocument();
        
        // Rebuild the node in the temporary document
        const rebuiltNode = rrwebSnapshot.rebuild(snapshotData as any, {
          doc: rebuildDoc,
        });

        if (rebuiltNode) {
          const tagName = (rebuiltNode as Element).tagName?.toLowerCase();
          
          if (tagName === "html") {
            // Clone and replace entire HTML element
            const clonedHtml = doc.importNode(rebuiltNode, true);
            doc.replaceChild(clonedHtml, doc.documentElement);
          } else {
            // Clone and append content
            const clonedNode = doc.importNode(rebuiltNode, true);
            if (doc.body) {
              doc.body.appendChild(clonedNode);
            } else {
              doc.documentElement.appendChild(clonedNode);
            }
          }
        }

        console.log("✓ DOM Structure Recreated");
      } catch (error) {
        console.warn("Rebuild warning:", error);
        // Even if it fails, we continue to cleanup so the page isn't "live"
      }

      // FIX 4: Cleanup Scripts (Run this OUTSIDE the try block or after rebuild)
      // This ensures that even if rebuild hiccups, we kill the interactive scripts
      const scripts = doc.querySelectorAll("script");
      scripts.forEach((s) => s.remove());

      const noscripts = doc.querySelectorAll("noscript");
      noscripts.forEach((n) => n.remove());

      const preloads = doc.querySelectorAll(
        'link[rel="preload"], link[rel="modulepreload"]'
      );
      preloads.forEach((l) => l.remove());

      // 5. Inject Base HREF (For images)
      // Check if head exists, if not create it (snapshot might be partial)
      let head = doc.head;
      if (!head) {
        head = doc.createElement("head");
        doc.documentElement.insertBefore(head, doc.body);
      }
      const base = doc.createElement("base");
      base.href = origin || window.location.origin;
      head.insertBefore(base, head.firstChild);

      // 6. Inject Custom Styles
      if (styles && Array.isArray(styles)) {
        styles.forEach((styleObj: any) => {
          if (styleObj.type === "inline" && styleObj.content) {
            const s = doc.createElement("style");
            s.textContent = styleObj.content;
            head.appendChild(s);
          } else if (styleObj.type === "link" && styleObj.href) {
            const l = doc.createElement("link");
            l.rel = "stylesheet";
            l.href = styleObj.href;
            head.appendChild(l);
          }
        });
      }

      // 7. UI Cleanup + Surgical CSS to Force Hidden Animations (No script execution allowed)
      const style = doc.createElement("style");
      style.textContent = `
        html, body { min-height: 100%; margin: 0; height: auto; overflow: auto; }
        a, button, input, select { pointer-events: none !important; cursor: default !important; }
        
        /* Target ONLY elements that are hidden by animation libraries */
        [data-aos] { opacity: 1 !important; transform: none !important; animation: none !important; }
        .aos-animate { opacity: 1 !important; transform: none !important; }
        .wow { opacity: 1 !important; animation: none !important; }
        .animate__animated { opacity: 1 !important; animation: none !important; }
        .fadeIn, .fadeInUp, .fadeInDown, .fadeInLeft, .fadeInRight { opacity: 1 !important; animation: none !important; }
        .slideIn, .slideUp, .slideDown { transform: none !important; opacity: 1 !important; animation: none !important; }
        .zoomIn { transform: none !important; opacity: 1 !important; animation: none !important; }
        [class*="bounceIn"] { transform: none !important; opacity: 1 !important; animation: none !important; }
        
        /* Force visibility on elements with opacity 0 in inline styles */
        [style*="opacity: 0"] { opacity: 1 !important; }
        [style*="opacity:0"] { opacity: 1 !important; }
        
        /* Override display: none and visibility: hidden ONLY in inline styles */
        [style*="display: none"] { display: block !important; }
        [style*="display:none"] { display: block !important; }
        [style*="visibility: hidden"] { visibility: visible !important; }
        [style*="visibility:hidden"] { visibility: visible !important; }
        
        /* Override height: 0 patterns (common in accordion/tabs) */
        [style*="height: 0"] { height: auto !important; }
        [style*="height:0"] { height: auto !important; }
        [style*="max-height: 0"] { max-height: 100% !important; }
        [style*="max-height:0"] { max-height: 100% !important; }
        
        /* Hide broken images gracefully */
        img:not([src]) { visibility: hidden !important; }
      `;
      head.appendChild(style);

      // 8. Force-remove all hiding attributes (DO NOT execute scripts)
      try {
        // Remove inline style display:none, visibility:hidden, opacity:0
        doc.querySelectorAll("[style]").forEach((el) => {
          const styleAttr = el.getAttribute("style") || "";
          if (
            styleAttr.includes("display") ||
            styleAttr.includes("visibility") ||
            styleAttr.includes("opacity")
          ) {
            const cleaned = styleAttr
              .replace(/display\s*:\s*none/gi, "display: block")
              .replace(/visibility\s*:\s*hidden/gi, "visibility: visible")
              .replace(/opacity\s*:\s*0/gi, "opacity: 1");
            el.setAttribute("style", cleaned);
          }
        });

        // Remove height: 0, max-height: 0 patterns
        doc
          .querySelectorAll(
            '[style*="height: 0"], [style*="max-height: 0"], [style*="min-height: 0"]'
          )
          .forEach((el) => {
            const styleAttr = el.getAttribute("style") || "";
            const cleaned = styleAttr
              .replace(/height\s*:\s*0[^;]*/gi, "height: auto")
              .replace(/max-height\s*:\s*0[^;]*/gi, "max-height: 100%")
              .replace(/min-height\s*:\s*0[^;]*/gi, "min-height: auto");
            el.setAttribute("style", cleaned);
          });

        // Force data-aos elements to be visible
        doc.querySelectorAll("[data-aos]").forEach((el) => {
          el.classList.add("aos-animate");
          if (el.style) {
            el.style.opacity = "1";
            el.style.visibility = "visible";
            el.style.transform = "none";
          }
        });
      } catch (e) {
        console.warn("Style cleanup failed:", e);
      }

      // 9. Initialize Overlays
      const canvasContainer = document.createElement("div");
      canvasContainer.id = "heatmap-canvas-container";
      canvasContainer.style.cssText =
        "position:absolute; top:0; left:0; width:100%; height:100%; z-index:2; pointer-events:none;";
      wrapper.appendChild(canvasContainer);

      const instance = h337.create({
        container: canvasContainer,
        radius: 25,
        maxOpacity: 0.7,
        minOpacity: 0,
        blur: 0.8,
        gradient: {
          "0.0": "blue",
          "0.25": "cyan",
          "0.5": "lime",
          "0.75": "yellow",
          "1.0": "red",
        },
      });
      setHeatmapInstance(instance);
      console.log("✓ Heatmap instance created");

      const overlayContainer = document.createElement("div");
      overlayContainer.id = "element-click-overlay";
      overlayContainer.style.cssText =
        "position:absolute; top:0; left:0; width:100%; height:100%; z-index:3; pointer-events:none;";
      wrapper.appendChild(overlayContainer);
      console.log("✓ Element click overlay container created");
    }, 100);
  }, [snapshotData, styles, origin]);
  // 5. Render Element Click Overlays
  useEffect(() => {
    console.log(
      "Element overlay effect running, elementClicks:",
      elementClicks.length,
      "dataType:",
      dataType
    );

    if (elementClicks.length === 0) return;

    // Only show element overlays for clicks data type
    if (dataType !== "clicks" && dataType !== "both") {
      const overlayContainer = document.getElementById("element-click-overlay");
      if (overlayContainer) {
        overlayContainer.innerHTML = "";
        console.log("Cleared element overlays for dataType:", dataType);
      }
      return;
    }

    const overlayContainer = document.getElementById("element-click-overlay");
    if (!overlayContainer) {
      console.log("Element overlay container not found");
      return;
    }

    console.log(
      "Creating element overlays for",
      elementClicks.length,
      "elements"
    );

    // Clear previous overlays
    overlayContainer.innerHTML = "";

    // Create overlay elements for each clicked element
    elementClicks.forEach((element, index) => {
      const elementDiv = document.createElement("div");
      elementDiv.style.position = "absolute";
      elementDiv.style.left = `${element.x - 10}px`; // Center the indicator
      elementDiv.style.top = `${element.y - 10}px`;
      elementDiv.style.width = "20px";
      elementDiv.style.height = "20px";
      elementDiv.style.borderRadius = "50%";
      elementDiv.style.backgroundColor = "rgba(255, 0, 0, 0.8)";
      elementDiv.style.border = "2px solid white";
      elementDiv.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      elementDiv.style.cursor = "pointer";
      elementDiv.style.pointerEvents = "auto";
      elementDiv.style.zIndex = "10";
      elementDiv.title = `${
        element.clickCount
      } clicks (${element.percentage.toFixed(1)}%) - ${
        element.tag
      }: ${element.text.substring(0, 50)}`;

      // Create tooltip
      const tooltip = document.createElement("div");
      tooltip.style.position = "absolute";
      tooltip.style.bottom = "25px";
      tooltip.style.left = "50%";
      tooltip.style.transform = "translateX(-50%)";
      tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      tooltip.style.color = "white";
      tooltip.style.padding = "8px 12px";
      tooltip.style.borderRadius = "4px";
      tooltip.style.fontSize = "12px";
      tooltip.style.whiteSpace = "nowrap";
      tooltip.style.opacity = "0";
      tooltip.style.transition = "opacity 0.2s";
      tooltip.style.pointerEvents = "none";
      tooltip.style.zIndex = "11";

      tooltip.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${
          element.clickCount
        } clicks (${element.percentage.toFixed(1)}%)</div>
        <div style="font-size: 11px; color: #ccc;">${element.tag.toUpperCase()}: ${element.text.substring(
        0,
        30
      )}${element.text.length > 30 ? "..." : ""}</div>
        ${
          element.href
            ? `<div style="font-size: 11px; color: #aaa;">${element.href.substring(
                0,
                40
              )}${element.href.length > 40 ? "..." : ""}</div>`
            : ""
        }
      `;

      elementDiv.appendChild(tooltip);

      // Show/hide tooltip on hover
      elementDiv.addEventListener("mouseenter", () => {
        tooltip.style.opacity = "1";
      });
      elementDiv.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
      });

      overlayContainer.appendChild(elementDiv);
    });

    console.log(`Rendered ${elementClicks.length} element click overlays`);
  }, [elementClicks, dataType]);

  // Keep old heatmap rendering for backward compatibility
  useEffect(() => {
    console.log(
      "Heatmap rendering effect running, heatmapInstance:",
      !!heatmapInstance,
      "clickData:",
      clickData.length,
      "dataType:",
      dataType
    );

    if (!heatmapInstance) {
      console.log("No heatmap instance yet");
      return;
    }

    // Only render heatmap for clicks data type
    if (dataType === "clicks" || dataType === "both") {
      console.log("Rendering heatmap, data points:", clickData.length);

      if (clickData.length === 0) {
        console.log("No click data to render heatmap");
        heatmapInstance.setData({ max: 0, data: [] });
        return;
      }

      const maxValue = Math.max(...clickData.map((d) => d.value));
      const heatmapData = {
        max: maxValue,
        data: clickData.map((point) => ({
          x: Math.round(point.x),
          y: Math.round(point.y),
          value: point.value,
        })),
      };

      console.log("Setting heatmap data:", {
        max: heatmapData.max,
        points: heatmapData.data.length,
      });

      // Force canvas to be visible
      const canvas = document.querySelector("#heatmap-canvas-container canvas");
      if (canvas) {
        console.log("Canvas element found, forcing visibility");
        (canvas as HTMLElement).style.opacity = "1";
        (canvas as HTMLElement).style.display = "block";
      }

      heatmapInstance.setData(heatmapData);
    } else {
      // Clear heatmap for other data types
      console.log("Clearing heatmap for dataType:", dataType);
      heatmapInstance.setData({ max: 0, data: [] });
    }
  }, [heatmapInstance, clickData, dataType]);

  return (
    <div
      ref={iframeContainerRef}
      className="w-full h-full bg-white border border-gray-300"
    />
  );
}
