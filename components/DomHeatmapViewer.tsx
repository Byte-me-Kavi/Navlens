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
  const [canvasSized, setCanvasSized] = useState(false);

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
            console.warn("Snapshot not found");
            return;
          }
          throw new Error(`Failed to fetch snapshot: ${response.status}`);
        }

        const json = await response.json();

        if (json.snapshot) {
          setSnapshotData(json.snapshot);
          setStyles(json.styles || []);
          setOrigin(json.origin || window.location.origin);
        } else {
          setSnapshotData(json);
          setStyles([]);
          setOrigin(window.location.origin);
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
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        const elementResponse = await fetch("/api/element-clicks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteId,
            pagePath,
            deviceType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        });

        if (elementResponse.ok) {
          const elementData = await elementResponse.json();
          setElementClicks(elementData || []);
        }

        const heatmapResponse = await fetch(
          `/api/heatmap-clicks?siteId=${encodeURIComponent(
            siteId
          )}&pagePath=${encodeURIComponent(
            pagePath
          )}&deviceType=${encodeURIComponent(deviceType)}`
        );

        if (heatmapResponse.ok) {
          const heatmapData = await heatmapResponse.json();
          setClickData(heatmapData.clicks || []);
        }
      } catch (error) {
        console.error("Error fetching click data:", error);
      }
    };

    fetchClickData();
  }, [siteId, pagePath, deviceType]);

  // 3. Rebuild the DOM
  useEffect(() => {
    if (!snapshotData || !iframeContainerRef.current) return;

    console.log("=== Starting DOM Rebuild ===");
    const container = iframeContainerRef.current;
    container.innerHTML = "";

    // 1. Create Iframe Wrapper
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position: relative; width: 100%; height: 100%;";
    container.appendChild(wrapper);

    // 2. Create Iframe (lower z-index)
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0; z-index: 1;";
    // Removed scrolling="no" to ensure iframe allows scrolling if that's what you prefer,
    // but kept sandbox as requested.
    iframe.setAttribute("sandbox", "allow-same-origin");
    wrapper.appendChild(iframe);

    // 3. Create Canvas Container (higher z-index, positioned after iframe)
    const canvasContainer = document.createElement("div");
    canvasContainer.id = "heatmap-canvas-container";
    canvasContainer.style.cssText =
      "position:absolute; top:0; left:0; width:100%; height:100%; z-index:100; pointer-events:none; background:transparent;";
    wrapper.appendChild(canvasContainer);

    // 4. Create Element Click Overlay (highest z-index)
    const overlayContainer = document.createElement("div");
    overlayContainer.id = "element-click-overlay";
    overlayContainer.style.cssText =
      "position:absolute; top:0; left:0; width:100%; height:100%; z-index:101; pointer-events:none;";
    wrapper.appendChild(overlayContainer);

    // 5. Initialize Heatmap Instance (moved here - will be created after dimensions are known)
    // Heatmap instance creation is now deferred until after content dimensions are calculated

    // 3. Rebuild Content
    setTimeout(() => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      try {
        doc.open();
        doc.write("<!DOCTYPE html>");
        doc.close();

        const mirror = new rrwebSnapshot.Mirror();
        const cache = {
          stylesWithHoverClass: new Map(),
          cssRulesWithHoverClass: new Set(),
        };
        const rebuiltNode = rrwebSnapshot.rebuild(snapshotData as any, {
          doc,
          mirror,
          cache,
        });

        if (rebuiltNode) {
          const tagName = (rebuiltNode as Element).tagName?.toLowerCase();
          if (tagName === "html") {
            const clonedHtml = (rebuiltNode as Element).cloneNode(true);
            doc.replaceChild(clonedHtml, doc.documentElement);
          } else {
            const clonedNode = (rebuiltNode as Element).cloneNode(true);
            doc.body
              ? doc.body.appendChild(clonedNode)
              : doc.documentElement.appendChild(clonedNode);
          }
        }
      } catch (error) {
        console.warn("Rebuild warning:", error);
      }

      // Cleanup Scripts
      const scripts = doc.querySelectorAll("script");
      scripts.forEach((s) => s.remove());
      const noscripts = doc.querySelectorAll("noscript");
      noscripts.forEach((n) => n.remove());
      const preloads = doc.querySelectorAll(
        'link[rel="preload"], link[rel="modulepreload"]'
      );
      preloads.forEach((l) => l.remove());

      // Inject Base HREF
      let head = doc.head;
      if (!head) {
        head = doc.createElement("head");
        doc.documentElement.insertBefore(head, doc.body);
      }
      const base = doc.createElement("base");
      base.href = origin || window.location.origin;
      head.insertBefore(base, head.firstChild);

      // Inject Custom Styles
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

      // UI Cleanup
      const style = doc.createElement("style");
      style.textContent = `
        html, body { min-height: 100%; margin: 0; height: auto; overflow: auto; }
        a, button, input, select { pointer-events: none !important; cursor: default !important; }
        [data-aos] { opacity: 1 !important; transform: none !important; animation: none !important; }
        .aos-animate { opacity: 1 !important; transform: none !important; }
        .wow { opacity: 1 !important; animation: none !important; }
        img:not([src]) { visibility: hidden !important; }
      `;
      head.appendChild(style);

      // Force-remove hiding attributes
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

      // === CALCULATE CONTENT DIMENSIONS FOR HEATMAP ===
      const getContentDimensions = () => {
        const contentHeight = Math.max(
          doc.body.scrollHeight,
          doc.documentElement.scrollHeight,
          doc.getElementById("__next")?.scrollHeight || 0,
          doc.getElementById("root")?.scrollHeight || 0
        );

        const contentWidth = doc.documentElement.scrollWidth;
        return { contentWidth, contentHeight };
      };

      const { contentWidth, contentHeight } = getContentDimensions();

      // === THE FIX: SCROLL SYNCHRONIZATION ===
      // We target BOTH the canvasContainer AND the overlayContainer
      const syncScroll = () => {
        const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
        const scrollLeft =
          doc.documentElement.scrollLeft || doc.body.scrollLeft;

        const transformValue = `translate(${-scrollLeft}px, ${-scrollTop}px)`;

        // 1. Move Heatmap
        if (canvasContainer) {
          canvasContainer.style.transform = transformValue;
        }

        // 2. Move Element Overlays (This was missing/broken in your original)
        // We re-fetch it by ID to be absolutely sure we have the element
        const elOverlay = document.getElementById("element-click-overlay");
        if (elOverlay) {
          elOverlay.style.transform = transformValue;
        }
      };

      // === EXPAND CONTAINERS TO FULL CONTENT SIZE ===
      if (contentHeight > 0) {
        // Expand canvas container to full content size
        canvasContainer.style.width = `${contentWidth}px`;
        canvasContainer.style.height = `${contentHeight}px`;

        // === NOW CREATE HEATMAP INSTANCE WITH CORRECT DIMENSIONS ===
        const instance = h337.create({
          container: canvasContainer,
          radius: 30,
          maxOpacity: 0.9,
          minOpacity: 0,
          blur: 0.4,
          gradient: {
            "0.0": "blue",
            "0.25": "cyan",
            "0.5": "lime",
            "0.75": "yellow",
            "1.0": "red",
          },
        });
        setHeatmapInstance(instance);

        // Mark canvas as sized
        setCanvasSized(true);
      }

      // Listen to iframe scroll
      iframe.contentWindow?.addEventListener("scroll", syncScroll);
      doc.addEventListener("scroll", syncScroll);

      // Initial scroll sync
      syncScroll();

      console.log("✓ DOM Structure Recreated & Sync Active");
    }, 100);
  }, [snapshotData, styles, origin]);

  // 5. Render Element Click Overlays
  useEffect(() => {
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
      "clicked elements"
    );

    // Clear previous overlays
    overlayContainer.innerHTML = "";

    // Create overlay elements for each clicked element (RED overlays)
    // Use dynamic positioning that accounts for scrolling
    setTimeout(() => {
      const iframe = document.querySelector("iframe");
      const doc = iframe?.contentDocument;

      elementClicks.forEach((element) => {
        let x = element.x;
        let y = element.y;

        // Try to find the corresponding element in the DOM for accurate positioning
        if (doc && element.selector) {
          try {
            const domElement = doc.querySelector(element.selector);
            if (domElement) {
              const rect = domElement.getBoundingClientRect();
              x = rect.left;
              y = rect.top;
            }
          } catch (e) {
            // Selector invalid, use stored coordinates
          }
        }

        // Create the red overlay
        const elementDiv = document.createElement("div");
        elementDiv.style.position = "absolute";
        elementDiv.style.left = `${x}px`;
        elementDiv.style.top = `${y}px`;
        elementDiv.style.width = `${element.width}px`;
        elementDiv.style.height = `${element.height}px`;
        elementDiv.style.border = "2px solid red";
        elementDiv.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
        elementDiv.style.boxShadow = "0 0 0 1px rgba(255, 0, 0, 0.5)";
        elementDiv.style.pointerEvents = "none";
        elementDiv.style.zIndex = "10";

        const tooltip = document.createElement("div");
        tooltip.style.position = "absolute";
        tooltip.style.bottom = `${element.height + 5}px`;
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
    }, 600); // Delay to ensure DOM is ready

    // Now scan iframe for clickable elements and show BLUE overlays for non-clicked ones
    setTimeout(() => {
      const iframe = document.querySelector("iframe");
      if (!iframe || !iframe.contentDocument) return;

      const doc = iframe.contentDocument;

      // Set up scroll synchronization for element overlays
      const syncElementOverlays = () => {
        const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
        const scrollLeft =
          doc.documentElement.scrollLeft || doc.body.scrollLeft;

        // Apply transform to overlay container to counter the scroll
        overlayContainer.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
      };

      // Listen to iframe scroll events
      iframe.contentWindow?.addEventListener("scroll", syncElementOverlays);
      doc.addEventListener("scroll", syncElementOverlays);

      // Initial sync
      syncElementOverlays();

      const clickableSelectors = [
        "button",
        'input[type="submit"]',
        'input[type="button"]',
        "a[href]",
        '[role="button"]',
        "[onclick]",
        'input[type="image"]',
        "area[href]",
        "select",
        "textarea",
      ];

      const clickableElements = doc.querySelectorAll(
        clickableSelectors.join(", ")
      );

      clickableElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // Skip invisible elements

        // Check if this element was already clicked (rough check by position and tag)
        const wasClicked = elementClicks.some(
          (clickedEl) =>
            clickedEl.tag.toLowerCase() === el.tagName.toLowerCase() &&
            Math.abs(clickedEl.x - rect.left) < 10 &&
            Math.abs(clickedEl.y - rect.top) < 10
        );

        if (!wasClicked) {
          // Create BLUE overlay for non-clicked clickable element
          const elementDiv = document.createElement("div");
          elementDiv.style.position = "absolute";
          elementDiv.style.left = `${rect.left}px`;
          elementDiv.style.top = `${rect.top}px`;
          elementDiv.style.width = `${rect.width}px`;
          elementDiv.style.height = `${rect.height}px`;
          elementDiv.style.border = "2px solid blue";
          elementDiv.style.backgroundColor = "rgba(0, 0, 255, 0.1)";
          elementDiv.style.boxShadow = "0 0 0 1px rgba(0, 0, 255, 0.3)";
          elementDiv.style.pointerEvents = "none";
          elementDiv.style.zIndex = "9"; // Below clicked elements

          overlayContainer.appendChild(elementDiv);
        }
      });

      console.log(
        `Rendered ${elementClicks.length} red overlays + ${
          clickableElements.length - elementClicks.length
        } blue overlays`
      );
    }, 500); // Delay to ensure iframe is fully loaded
  }, [elementClicks, dataType, snapshotData]);

  // Heatmap Rendering
  useEffect(() => {
    if (dataType === "clicks" || dataType === "both") {
      if (clickData.length === 0 || !heatmapInstance || !canvasSized) {
        if (heatmapInstance) heatmapInstance.setData({ max: 0, data: [] });
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
      if (heatmapInstance) heatmapInstance.setData(heatmapData);
    } else {
      if (heatmapInstance) heatmapInstance.setData({ max: 0, data: [] });
    }
  }, [clickData, dataType, heatmapInstance, canvasSized]);

  return (
    <div
      ref={iframeContainerRef}
      className="w-full h-full bg-white border border-gray-300"
    />
  );
}
