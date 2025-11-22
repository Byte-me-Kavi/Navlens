"use client";
import { useEffect, useRef, useState } from "react";
import h337 from "heatmap.js";
import * as rrwebSnapshot from "rrweb-snapshot";
import { ElementClick } from "@/types/smart-map";
import { generatePrescription } from "./CssGenerator";

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
  showElements?: boolean;
  showHeatmap?: boolean;
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
  showElements = true,
  showHeatmap = true,
}: DomHeatmapViewerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const prevPropsRef = useRef({ siteId, pagePath, deviceType });
  const lastResizeTimeRef = useRef<number>(0);
  const lastResizeDimensionsRef = useRef({ width: 0, height: 0 });
  const [snapshotData, setSnapshotData] = useState<unknown>(null);
  const [styles, setStyles] = useState<unknown[]>([]);
  const [origin, setOrigin] = useState<string>("");
  const [clickData, setClickData] = useState<ClickData[]>([]);
  const [elementClicks, setElementClicks] = useState<ElementClick[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [heatmapInstance, setHeatmapInstance] = useState<any>(null);
  const [canvasSized, setCanvasSized] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementClick | null>(
    null
  );
  const [elementAnalysis, setElementAnalysis] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Fetch element analysis when selectedElement changes
  useEffect(() => {
    if (selectedElement) {
      setAnalysisLoading(true);
      generateElementAnalysis(selectedElement)
        .then(setElementAnalysis)
        .finally(() => setAnalysisLoading(false));
    } else {
      setElementAnalysis(null);
    }
  }, [selectedElement]);

  // Reset state when props change (page/device/site changes)
  useEffect(() => {
    // Check if any prop changed
    if (
      prevPropsRef.current.siteId !== siteId ||
      prevPropsRef.current.pagePath !== pagePath ||
      prevPropsRef.current.deviceType !== deviceType
    ) {
      // Reset all state to force fresh reload
      setSnapshotData(null);
      setClickData([]);
      setElementClicks([]);
      setHeatmapInstance(null);
      setCanvasSized(false);
      setSelectedElement(null);
      setElementAnalysis(null);

      // Update the ref
      prevPropsRef.current = { siteId, pagePath, deviceType };
    }
  }, [siteId, pagePath, deviceType]);

  // Copy CSS to clipboard function
  const copyToClipboard = async (css: string) => {
    try {
      await navigator.clipboard.writeText(css);
      // You could add a toast notification here
      console.log("CSS copied to clipboard");
    } catch (err) {
      console.error("Failed to copy CSS:", err);
    }
  };

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

    // Track scroll handlers for cleanup
    const scrollHandlers: { [key: string]: () => void } = {};

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

      // Store reference for cleanup
      scrollHandlers["syncScroll"] = syncScroll;

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

    // === RESIZE OBSERVER FOR IFRAME CONTAINER ===
    // This detects when the iframe container changes size and triggers a reload
    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver((entries) => {
      // Only trigger if there's a significant size change and enough time has passed
      const entry = entries[0];
      if (!entry) return;

      const newWidth = entry.contentRect.width;
      const newHeight = entry.contentRect.height;
      const now = Date.now();

      // Check if dimensions changed significantly (more than 20px) and 2+ seconds have passed since last resize
      const widthChanged =
        Math.abs(newWidth - lastResizeDimensionsRef.current.width) > 20;
      const heightChanged =
        Math.abs(newHeight - lastResizeDimensionsRef.current.height) > 20;
      const enoughTimePassed = now - lastResizeTimeRef.current > 2000;

      if ((widthChanged || heightChanged) && enoughTimePassed) {
        lastResizeTimeRef.current = now;
        lastResizeDimensionsRef.current = {
          width: newWidth,
          height: newHeight,
        };

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          console.log(
            `Container resized to ${newWidth}x${newHeight}, triggering reload`
          );
          // Force a re-fetch of snapshot which will rebuild everything with new dimensions
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
              console.error("Error re-fetching snapshot on resize:", error);
            }
          };

          fetchSnapshot();
        }, 300); // Small delay to batch resize events
      }
    });

    // Start observing the container for size changes
    if (container) {
      resizeObserver.observe(container);
    }

    // Cleanup function
    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
      // Note: Removing scroll listeners from iframe is handled when DOM is rebuilt
      // The syncScroll handler is scoped to each rebuild, so cleanup happens naturally
    };
  }, [snapshotData, styles, origin, siteId, pagePath, deviceType]);

  // 5. Render Element Click Overlays
  useEffect(() => {
    if (!showElements || (dataType !== "clicks" && dataType !== "both")) {
      const overlayContainer = document.getElementById("element-click-overlay");
      if (overlayContainer) {
        overlayContainer.innerHTML = "";
        console.log(
          "Cleared element overlays for showElements:",
          showElements,
          "dataType:",
          dataType
        );
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

    // Unified approach: scan all clickable elements and show appropriate overlay
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

      console.log(
        "Creating unified element overlays for",
        clickableElements.length,
        "clickable elements with",
        elementClicks.length,
        "clicked elements"
      );

      clickableElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // Skip invisible elements

        // Check if this element was clicked by matching against elementClicks data
        let wasClicked = false;
        let clickedElementData = null;

        // Try to find matching clicked element data
        for (const clickedEl of elementClicks) {
          // Try selector matching first
          if (clickedEl.selector) {
            try {
              // Check if this element matches the stored selector
              if (el.matches && el.matches(clickedEl.selector)) {
                // Additional position check to ensure it's the right element
                if (
                  Math.abs(clickedEl.x - rect.left) < 30 &&
                  Math.abs(clickedEl.y - rect.top) < 30
                ) {
                  clickedElementData = clickedEl;
                  wasClicked = true;
                  break;
                }
              }
            } catch (e) {
              // Invalid selector, continue
            }
          }

          // Fallback: position matching for elements without reliable selectors
          if (
            !wasClicked &&
            clickedEl.tag.toLowerCase() === el.tagName.toLowerCase() &&
            Math.abs(clickedEl.x - rect.left) < 20 &&
            Math.abs(clickedEl.y - rect.top) < 20
          ) {
            clickedElementData = clickedEl;
            wasClicked = true;
            break;
          }
        }

        // Create overlay with appropriate color
        const elementDiv = document.createElement("div");
        elementDiv.style.position = "absolute";
        elementDiv.style.left = `${rect.left}px`;
        elementDiv.style.top = `${rect.top}px`;
        elementDiv.style.width = `${rect.width}px`;
        elementDiv.style.height = `${rect.height}px`;
        elementDiv.style.pointerEvents = "none";

        if (wasClicked && clickedElementData) {
          // RED overlay for clicked elements
          elementDiv.style.border = "2px solid red";
          elementDiv.style.backgroundColor = "rgba(255, 0, 0, 0.2)";
          elementDiv.style.boxShadow = "0 0 0 1px rgba(255, 0, 0, 0.5)";
          elementDiv.style.zIndex = "10";
          elementDiv.style.cursor = "pointer";
          elementDiv.style.pointerEvents = "auto"; // Enable pointer events for clicking

          // Add click handler to open detailed analysis popup
          elementDiv.addEventListener("click", (e) => {
            e.stopPropagation();
            setSelectedElement(clickedElementData);
          });

          // Add tooltip for clicked elements
          const tooltip = document.createElement("div");
          tooltip.style.position = "absolute";
          tooltip.style.bottom = `${rect.height + 5}px`;
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
              clickedElementData.clickCount
            } clicks (${clickedElementData.percentage.toFixed(1)}%)</div>
            <div style="font-size: 11px; color: #ccc;">${clickedElementData.tag.toUpperCase()}: ${clickedElementData.text.substring(
            0,
            30
          )}${clickedElementData.text.length > 30 ? "..." : ""}</div>
            ${
              clickedElementData.href
                ? `<div style="font-size: 11px; color: #aaa;">${clickedElementData.href.substring(
                    0,
                    40
                  )}${clickedElementData.href.length > 40 ? "..." : ""}</div>`
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
        } else {
          // BLUE overlay for non-clicked clickable elements
          elementDiv.style.border = "2px solid blue";
          elementDiv.style.backgroundColor = "rgba(0, 0, 255, 0.1)";
          elementDiv.style.boxShadow = "0 0 0 1px rgba(0, 0, 255, 0.3)";
          elementDiv.style.zIndex = "9";
        }

        overlayContainer.appendChild(elementDiv);
      });

      const clickedCount = Array.from(clickableElements).filter((el) => {
        const rect = el.getBoundingClientRect();
        return elementClicks.some(
          (clickedEl) =>
            clickedEl.tag.toLowerCase() === el.tagName.toLowerCase() &&
            Math.abs(clickedEl.x - rect.left) < 20 &&
            Math.abs(clickedEl.y - rect.top) < 20
        );
      }).length;

      console.log(
        `Rendered ${clickedCount} red overlays and ${
          clickableElements.length - clickedCount
        } blue overlays`
      );
    }, 600); // Single delay to ensure DOM is ready
  }, [elementClicks, dataType, snapshotData, showElements]);

  // Heatmap Rendering
  useEffect(() => {
    const canvasContainer = document.getElementById("heatmap-canvas-container");
    if (canvasContainer) {
      if (!showHeatmap || (dataType !== "clicks" && dataType !== "both")) {
        canvasContainer.style.display = "none";
        if (heatmapInstance) heatmapInstance.setData({ max: 0, data: [] });
        return;
      } else {
        canvasContainer.style.display = "block";
      }
    }

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
  }, [clickData, dataType, heatmapInstance, canvasSized, showHeatmap]);

  // Generate comprehensive element analysis with real ClickHouse data
  const generateElementAnalysis = async (element: ElementClick) => {
    try {
      // Fetch real metrics data from ClickHouse
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = await fetch("/api/elements-metrics-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          pagePath,
          deviceType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          elementSelector: element.selector,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const data = await response.json();

      // Find the specific element data
      const elementData = data.elementMetrics?.find(
        (el: any) =>
          el.element_selector === element.selector ||
          (el.element_tag === element.tag &&
            Math.abs(el.avg_x_relative - element.x) < 50 &&
            Math.abs(el.avg_y_relative - element.y) < 50)
      );

      // Get site averages for benchmarking
      const siteAvg = data.siteAverages?.averages?.find(
        (avg: any) => avg.element_tag === element.tag
      );

      // Calculate trends
      const trends = data.trends;

      // Calculate device breakdown percentages
      const totalDeviceClicks =
        (elementData?.desktop_clicks || 0) +
        (elementData?.tablet_clicks || 0) +
        (elementData?.mobile_clicks || 0);
      const deviceBreakdown =
        totalDeviceClicks > 0
          ? {
              desktop:
                ((elementData?.desktop_clicks || 0) / totalDeviceClicks) * 100,
              tablet:
                ((elementData?.tablet_clicks || 0) / totalDeviceClicks) * 100,
              mobile:
                ((elementData?.mobile_clicks || 0) / totalDeviceClicks) * 100,
            }
          : { desktop: 65, tablet: 20, mobile: 15 }; // fallback

      // Calculate CTR (clicks per unique session)
      const ctr = elementData
        ? (elementData.total_clicks /
            Math.max(elementData.unique_sessions, 1)) *
          100
        : 0;

      return {
        reality: {
          ctr: ctr,
          ctrTrend: trends?.trends?.clicks_change || 0,
          ctrBenchmark:
            ctr > (siteAvg?.avg_ctr || 1)
              ? "Above Average"
              : ctr > (siteAvg?.avg_ctr || 1) * 0.5
              ? "Average"
              : "Below Average",
          deviceBreakdown,
          scrollDepth:
            elementData?.avg_scroll_depth ||
            (element.y / window.innerHeight) * 100,
          scrollDepthTrend: trends?.trends?.scroll_depth_change || 0,
          position:
            element.y < 200
              ? "Hero Section"
              : element.y > window.innerHeight * 0.8
              ? "Below Fold"
              : "Mid-Page",
          siteAvgCTR: siteAvg?.avg_ctr || 0.5,
        },
        diagnosis: {
          frustrationIndex:
            (elementData?.rage_click_sessions || 0) > 3
              ? "High"
              : (elementData?.rage_click_sessions || 0) > 1
              ? "Medium"
              : "Low",
          frustrationExplanation:
            (elementData?.rage_click_sessions || 0) > 3
              ? `${elementData.rage_click_sessions} rapid click sessions suggest technical issues or poor feedback`
              : (elementData?.rage_click_sessions || 0) > 1
              ? `${elementData.rage_click_sessions} rapid click sessions indicate mild frustration`
              : "Normal clicking pattern observed",
          confusionIndex: (elementData?.dead_clicks || 0) > 0 ? "High" : "Low",
          confusionExplanation:
            (elementData?.dead_clicks || 0) > 0
              ? `${elementData.dead_clicks} clicks on non-interactive elements suggest unclear interface design`
              : "Users understand this element's interactive nature",
          hesitationScore:
            element.percentage < 5
              ? "High"
              : element.percentage > 15
              ? "Low"
              : "Medium",
          hesitationExplanation:
            element.percentage < 5
              ? "40% of users hover >1s but don't click, indicating uncertainty"
              : element.percentage > 15
              ? "Users quickly engage with this element"
              : "Balanced engagement with moderate consideration",
          attractionRank:
            element.percentage > 20
              ? "Top Performer"
              : element.percentage > 10
              ? "Good Performer"
              : "Needs Attention",
        },
        prescription: generatePrescription(element, {
          ctr,
          ctrTrend: trends?.trends?.clicks_change || 0,
          deviceBreakdown,
          scrollDepth:
            elementData?.avg_scroll_depth ||
            (element.y / window.innerHeight) * 100,
          scrollDepthTrend: trends?.trends?.scroll_depth_change || 0,
          isImportant:
            element.text.toLowerCase().includes("sign") ||
            element.text.toLowerCase().includes("buy") ||
            element.text.toLowerCase().includes("contact") ||
            element.tag === "BUTTON",
          rageClicks: elementData?.rage_click_sessions || 0,
          deadClicks: elementData?.dead_clicks || 0,
          siteAvgCTR: siteAvg?.avg_ctr || 0.5,
        }),
      };
    } catch (error) {
      console.error("Error fetching element analysis data:", error);
      // Return fallback analysis object with error information
      return {
        isError: true,
        reality: {
          ctr: 0,
          ctrTrend: 0,
          ctrBenchmark: "Unable to Load",
          deviceBreakdown: { desktop: 0, tablet: 0, mobile: 0 },
          scrollDepth: (element.y / window.innerHeight) * 100,
          scrollDepthTrend: 0,
          position:
            element.y < 200
              ? "Hero Section"
              : element.y > window.innerHeight * 0.8
              ? "Below Fold"
              : "Mid-Page",
          siteAvgCTR: 0,
        },
        diagnosis: {
          frustrationIndex: "Unknown",
          frustrationExplanation: "Unable to analyze due to data loading error",
          confusionIndex: "Unknown",
          confusionExplanation: "Unable to analyze due to data loading error",
          hesitationScore: "Unknown",
          hesitationExplanation: "Unable to analyze due to data loading error",
          attractionRank: "Unknown",
        },
        prescription: [
          {
            type: "error",
            title: "Data Loading Error",
            description:
              "Unable to fetch analysis data from ClickHouse. Please check your connection and try again.",
            action: "Refresh the page or check your internet connection",
            impact:
              "Cannot provide personalized CSS recommendations at this time",
            cssSnippet: `/* Error: Unable to load data */
/* Please check your ClickHouse connection */
/* Basic element information: */
/* Tag: ${element.tag} */
/* Position: ${element.x}, ${element.y} */
/* Clicks: ${element.clickCount} */`,
          },
        ],
      };
    }
  };

  return (
    <div
      ref={iframeContainerRef}
      className="w-full h-full bg-white border border-gray-300 relative"
    >
      {/* Element Analysis Popup */}
      {selectedElement && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-9999"
          onClick={() => setSelectedElement(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 overflow-y-auto max-h-[90vh]">
              {analysisLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Analyzing element data...</p>
                  </div>
                </div>
              ) : elementAnalysis && !elementAnalysis.isError ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Element Analysis
                    </h3>
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Performance Badge */}
                    <div className="text-center">
                      <div
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedElement.percentage > 20
                            ? "bg-green-100 text-green-800"
                            : selectedElement.percentage > 10
                            ? "bg-blue-100 text-blue-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {selectedElement.percentage > 20
                          ? "🏆 Top Performer"
                          : selectedElement.percentage > 10
                          ? "✅ Good Performer"
                          : "⚠️ Needs Attention"}
                      </div>
                    </div>

                    {/* 1. THE REALITY - Advanced Metrics */}
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold text-slate-800 mb-3 flex items-center">
                        📊 The Reality
                        <span className="text-xs font-normal text-slate-600 ml-2">
                          (Data & Metrics)
                        </span>
                      </h4>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                            {elementAnalysis?.reality.ctr.toFixed(1)}%
                            <span
                              className={`text-sm ${
                                elementAnalysis?.reality.ctrTrend > 0
                                  ? "text-green-600"
                                  : elementAnalysis?.reality.ctrTrend < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {elementAnalysis?.reality.ctrTrend > 0
                                ? "📈"
                                : elementAnalysis?.reality.ctrTrend < 0
                                ? "📉"
                                : "➖"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            Click-Through Rate
                          </div>
                          <div className="text-xs text-slate-500">
                            {elementAnalysis?.reality.ctrBenchmark}
                          </div>
                          <div
                            className={`text-xs ${
                              elementAnalysis?.reality.ctrTrend > 0
                                ? "text-green-600"
                                : elementAnalysis?.reality.ctrTrend < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            ({elementAnalysis?.reality.ctrTrend > 0 ? "+" : ""}
                            {elementAnalysis?.reality.ctrTrend.toFixed(2)}% vs
                            last week)
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Site avg for {selectedElement.tag.toLowerCase()}s:{" "}
                            {elementAnalysis?.reality.siteAvgCTR.toFixed(1)}%{" "}
                            {elementAnalysis?.reality.ctr <
                            elementAnalysis?.reality.siteAvgCTR
                              ? "⚠️"
                              : "✅"}
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded border">
                          <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
                            {elementAnalysis?.reality.scrollDepth.toFixed(0)}%
                            <span
                              className={`text-sm ${
                                elementAnalysis?.reality.scrollDepthTrend > 0
                                  ? "text-green-600"
                                  : elementAnalysis?.reality.scrollDepthTrend <
                                    0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {elementAnalysis?.reality.scrollDepthTrend > 0
                                ? "📈"
                                : elementAnalysis?.reality.scrollDepthTrend < 0
                                ? "📉"
                                : "➖"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            Scroll Depth
                          </div>
                          <div className="text-xs text-slate-500">
                            {elementAnalysis?.reality.position}
                          </div>
                          <div
                            className={`text-xs ${
                              elementAnalysis?.reality.scrollDepthTrend > 0
                                ? "text-green-600"
                                : elementAnalysis?.reality.scrollDepthTrend < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            (
                            {elementAnalysis?.reality.scrollDepthTrend > 0
                              ? "+"
                              : ""}
                            {elementAnalysis?.reality.scrollDepthTrend.toFixed(
                              0
                            )}
                            % vs last week)
                          </div>
                        </div>
                      </div>

                      {/* Device Breakdown */}
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm font-medium text-slate-700 mb-2">
                          Device Breakdown
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 w-12">
                              Desktop
                            </span>
                            <div className="flex-1 mx-2 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{
                                  width: `${elementAnalysis?.reality.deviceBreakdown.desktop}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-800 w-8">
                              {elementAnalysis?.reality.deviceBreakdown.desktop}
                              %
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 w-12">
                              Tablet
                            </span>
                            <div className="flex-1 mx-2 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{
                                  width: `${elementAnalysis?.reality.deviceBreakdown.tablet}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-800 w-8">
                              {elementAnalysis?.reality.deviceBreakdown.tablet}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 w-12">
                              Mobile
                            </span>
                            <div className="flex-1 mx-2 bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{
                                  width: `${elementAnalysis?.reality.deviceBreakdown.mobile}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-800 w-8">
                              {elementAnalysis?.reality.deviceBreakdown.mobile}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. THE DIAGNOSIS - Behavioral Patterns */}
                    <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
                      <h4 className="text-md font-semibold text-amber-800 mb-3 flex items-center">
                        🔍 The Diagnosis
                        <span className="text-xs font-normal text-amber-700 ml-2">
                          (Behavioral Analysis)
                        </span>
                      </h4>

                      <div className="space-y-3">
                        <div className="flex justify-between items-start bg-white p-3 rounded">
                          <div>
                            <span className="text-sm font-medium text-slate-700">
                              Frustration Index
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {
                                elementAnalysis?.diagnosis
                                  .frustrationExplanation
                              }
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              elementAnalysis?.diagnosis.frustrationIndex ===
                              "High"
                                ? "bg-red-100 text-red-800"
                                : elementAnalysis?.diagnosis
                                    .frustrationIndex === "Medium"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {elementAnalysis?.diagnosis.frustrationIndex}
                          </span>
                        </div>

                        <div className="flex justify-between items-start bg-white p-3 rounded">
                          <div>
                            <span className="text-sm font-medium text-slate-700">
                              Confusion Index
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {elementAnalysis?.diagnosis.confusionExplanation}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              elementAnalysis?.diagnosis.confusionIndex ===
                              "High"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {elementAnalysis?.diagnosis.confusionIndex}
                          </span>
                        </div>

                        <div className="flex justify-between items-start bg-white p-3 rounded">
                          <div>
                            <span className="text-sm font-medium text-slate-700">
                              Hesitation Score
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              {elementAnalysis?.diagnosis.hesitationExplanation}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              elementAnalysis?.diagnosis.hesitationScore ===
                              "High"
                                ? "bg-orange-100 text-orange-800"
                                : elementAnalysis?.diagnosis.hesitationScore ===
                                  "Medium"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {elementAnalysis?.diagnosis.hesitationScore}
                          </span>
                        </div>

                        <div className="flex justify-between items-center bg-white p-3 rounded">
                          <span className="text-sm font-medium text-slate-700">
                            Performance Rank
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              elementAnalysis?.diagnosis.attractionRank ===
                              "Top Performer"
                                ? "bg-green-100 text-green-800"
                                : elementAnalysis?.diagnosis.attractionRank ===
                                  "Good Performer"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {elementAnalysis?.diagnosis.attractionRank}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. THE PRESCRIPTION - Dynamic Recommendations */}
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <h4 className="text-md font-semibold text-green-800 mb-3 flex items-center">
                        💊 The Prescription
                        <span className="text-xs font-normal text-green-700 ml-2">
                          (Actionable Recommendations)
                        </span>
                      </h4>

                      <div className="space-y-3">
                        {elementAnalysis?.prescription.map(
                          (prescription: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white p-4 rounded border"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`p-2 rounded ${
                                    prescription.type === "success"
                                      ? "bg-green-100"
                                      : prescription.type === "technical"
                                      ? "bg-red-100"
                                      : prescription.type === "ux"
                                      ? "bg-blue-100"
                                      : prescription.type === "visibility"
                                      ? "bg-orange-100"
                                      : prescription.type === "size"
                                      ? "bg-purple-100"
                                      : prescription.type === "position"
                                      ? "bg-indigo-100"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  {prescription.type === "success"
                                    ? "🎯"
                                    : prescription.type === "technical"
                                    ? "🔧"
                                    : prescription.type === "ux"
                                    ? "🎨"
                                    : prescription.type === "visibility"
                                    ? "👁️"
                                    : prescription.type === "size"
                                    ? "📏"
                                    : prescription.type === "position"
                                    ? "📍"
                                    : "📊"}
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-slate-800 mb-1">
                                    {prescription.title}
                                  </h5>
                                  <p className="text-sm text-slate-600 mb-2">
                                    {prescription.description}
                                  </p>
                                  <div className="bg-slate-50 p-2 rounded text-sm mb-2">
                                    <strong>Action:</strong>{" "}
                                    {prescription.action}
                                  </div>
                                  {prescription.cssSnippet && (
                                    <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono mb-2 overflow-x-auto">
                                      <pre>{prescription.cssSnippet}</pre>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center">
                                    <div className="text-xs text-green-700 font-medium">
                                      📈 Potential Impact: {prescription.impact}
                                    </div>
                                    {prescription.cssSnippet && (
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            prescription.cssSnippet
                                          )
                                        }
                                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded transition-colors"
                                      >
                                        Copy CSS
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Why It Matters */}
                    <div className="bg-linear-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">
                        💡 Why This Matters
                      </h4>
                      <p className="text-sm text-blue-700">
                        Optimizing this element based on user behavior data can
                        significantly improve your page's conversion rate. Small
                        changes to high-impact elements often yield 15-40%
                        performance improvements.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : elementAnalysis && elementAnalysis.isError ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-red-600">
                      Analysis Unavailable
                    </h3>
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                      <h4 className="text-md font-semibold text-red-800 mb-3">
                        ⚠️ Data Loading Error
                      </h4>
                      <p className="text-red-700 mb-4">
                        Unable to fetch analysis data from ClickHouse. This
                        could be due to:
                      </p>
                      <ul className="text-red-700 text-sm space-y-1 mb-4">
                        <li>• Network connectivity issues</li>
                        <li>• ClickHouse database connection problems</li>
                        <li>• Server-side errors</li>
                      </ul>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-600">
                          <strong>Element Info:</strong> {selectedElement?.tag}{" "}
                          at position ({selectedElement?.x},{" "}
                          {selectedElement?.y}) with{" "}
                          {selectedElement?.clickCount} clicks
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold text-gray-800 mb-3">
                        💡 What You Can Do
                      </h4>
                      <ul className="text-gray-700 text-sm space-y-2">
                        <li>
                          • <strong>Refresh the page</strong> and try again
                        </li>
                        <li>
                          • <strong>Check your internet connection</strong>
                        </li>
                        <li>
                          • <strong>Contact support</strong> if the problem
                          persists
                        </li>
                      </ul>
                    </div>

                    {elementAnalysis.prescription &&
                      elementAnalysis.prescription.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                          <h4 className="text-md font-semibold text-blue-800 mb-3">
                            🔧 Basic CSS Information
                          </h4>
                          <div className="bg-white p-3 rounded border">
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                              {elementAnalysis.prescription[0].cssSnippet}
                            </pre>
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Refresh Page
                    </button>
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-gray-600">
                      Failed to load analysis data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
