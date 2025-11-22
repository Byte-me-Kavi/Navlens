/**
 * ElementOverlay Component
 *
 * Renders clickable element overlays
 */

"use client";

import { useEffect, useState, useRef } from "react";
import type { ElementClick } from "../types/element.types";
import { ElementAnalysisModal } from "./ElementAnalysisModal";

interface ElementOverlayProps {
  elements: ElementClick[];
  iframe: HTMLIFrameElement | null;
  siteId: string;
  pagePath: string;
  deviceType: string;
  onOverlaysRendered?: () => void;
}

export function ElementOverlay({
  elements,
  iframe,
  siteId,
  pagePath,
  deviceType,
  onOverlaysRendered,
}: ElementOverlayProps) {
  const [selectedElement, setSelectedElement] = useState<ElementClick | null>(
    null
  );
  const [iframeReady, setIframeReady] = useState(false);
  const hasNotifiedRef = useRef(false);

  // Check iframe readiness
  useEffect(() => {
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
      console.log("⏳ Element overlay waiting for iframe to be ready...");
      setIframeReady(false);
      return;
    }

    setIframeReady(true);
  }, [iframe]);

  // Render overlays based on click data with relative coordinates
  useEffect(() => {
    // Reset notification flag when dependencies change
    hasNotifiedRef.current = false;

    if (!iframeReady || !iframe?.contentDocument) {
      return;
    }

    console.log("🔴 Rendering element overlays:", elements.length, "elements");

    const container = document.getElementById("element-overlay-container");
    if (!container) {
      console.warn("⚠️ Element overlay container not found");
      return;
    }

    // Clear previous overlays
    container.innerHTML = "";

    const doc = iframe.contentDocument;

    // Get current iframe document dimensions
    const currentDocWidth =
      doc.documentElement.scrollWidth || doc.body.scrollWidth || 1024;
    const currentDocHeight =
      doc.documentElement.scrollHeight || doc.body.scrollHeight || 768;

    console.log("📏 Iframe content dimensions:", {
      currentDocWidth,
      currentDocHeight,
    });

    // Create overlays for each click using relative coordinates
    elements.forEach((clickData) => {
      // Skip if no relative coordinates
      if (
        typeof clickData.x_relative !== "number" ||
        typeof clickData.y_relative !== "number"
      ) {
        console.warn(
          "⚠️ Skipping element without relative coordinates:",
          clickData
        );
        return;
      }

      // Calculate absolute position from relative coordinates
      // This ensures accuracy across different viewport sizes
      const absoluteX = clickData.x_relative * currentDocWidth;
      const absoluteY = clickData.y_relative * currentDocHeight;

      console.log(
        `🎯 Positioning overlay at relative (${clickData.x_relative}, ${
          clickData.y_relative
        }) => absolute (${absoluteX.toFixed(0)}, ${absoluteY.toFixed(0)})`
      );

      // Create overlay element at exact click position
      const overlayDiv = document.createElement("div");
      overlayDiv.style.position = "absolute";

      // Center the overlay circle on the click point
      const overlaySize = 40; // Size of the overlay circle
      overlayDiv.style.left = `${absoluteX - overlaySize / 2}px`;
      overlayDiv.style.top = `${absoluteY - overlaySize / 2}px`;
      overlayDiv.style.width = `${overlaySize}px`;
      overlayDiv.style.height = `${overlaySize}px`;
      overlayDiv.style.borderRadius = "50%";
      overlayDiv.style.pointerEvents = "auto";
      overlayDiv.style.cursor = "pointer";
      overlayDiv.style.transition = "all 0.2s ease";

      // Styling for click overlay
      overlayDiv.style.border = "3px solid rgba(255, 0, 0, 0.8)";
      overlayDiv.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
      overlayDiv.style.boxShadow =
        "0 0 10px rgba(255, 0, 0, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.3)";
      overlayDiv.style.zIndex = "100";

      // Add click count badge
      const badge = document.createElement("div");
      badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: linear-gradient(135deg, #ff0000, #cc0000);
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        pointer-events: none;
        min-width: 20px;
        text-align: center;
      `;
      badge.textContent = String(clickData.clickCount || 1);
      overlayDiv.appendChild(badge);

      // Add tooltip
      const tooltip = document.createElement("div");
      tooltip.style.cssText = `
        position: absolute;
        bottom: ${overlaySize + 10}px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        z-index: 101;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      `;
      tooltip.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px; color: #ff6b6b;">
          ${clickData.clickCount} clicks (${clickData.percentage.toFixed(1)}%)
        </div>
        <div style="font-size: 11px; color: #ddd; margin-bottom: 3px;">
          ${clickData.tag.toUpperCase()}: ${clickData.text.substring(0, 40)}${
        clickData.text.length > 40 ? "..." : ""
      }
        </div>
        <div style="font-size: 10px; color: #999;">
          Position: (${Math.round(absoluteX)}, ${Math.round(absoluteY)})
        </div>
      `;
      overlayDiv.appendChild(tooltip);

      // Hover interactions
      overlayDiv.addEventListener("mouseenter", () => {
        tooltip.style.opacity = "1";
        overlayDiv.style.transform = "scale(1.2)";
        overlayDiv.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
        overlayDiv.style.boxShadow =
          "0 0 20px rgba(255, 0, 0, 0.9), inset 0 0 15px rgba(255, 255, 255, 0.5)";
      });
      overlayDiv.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
        overlayDiv.style.transform = "scale(1)";
        overlayDiv.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
        overlayDiv.style.boxShadow =
          "0 0 10px rgba(255, 0, 0, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.3)";
      });

      // Click interaction
      overlayDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedElement(clickData);
      });

      container.appendChild(overlayDiv);
    });

    console.log(
      `✓ Rendered ${elements.length} click overlays using relative coordinates`
    );

    // Update container dimensions to match iframe content
    container.style.width = `${currentDocWidth}px`;
    container.style.height = `${currentDocHeight}px`;

    // Notify parent that overlays are rendered (only once)
    if (onOverlaysRendered && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onOverlaysRendered();
    }

    // Handle resize to recalculate positions
    const handleResize = () => {
      const newDocWidth =
        doc.documentElement.scrollWidth || doc.body.scrollWidth || 1024;
      const newDocHeight =
        doc.documentElement.scrollHeight || doc.body.scrollHeight || 768;

      // Only trigger re-render if dimensions actually changed
      if (
        newDocWidth !== currentDocWidth ||
        newDocHeight !== currentDocHeight
      ) {
        console.log("🔄 Iframe dimensions changed, re-rendering overlays");
        setIframeReady(false);
        setTimeout(() => setIframeReady(true), 50);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(doc.documentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elements, iframe, iframeReady]);

  return (
    <>
      <div
        id="element-overlay-container"
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          zIndex: 101,
          transformOrigin: "top left",
          willChange: "transform",
        }}
      />

      {selectedElement && (
        <ElementAnalysisModal
          element={selectedElement}
          siteId={siteId}
          pagePath={pagePath}
          deviceType={deviceType}
          onClose={() => setSelectedElement(null)}
        />
      )}
    </>
  );
}
