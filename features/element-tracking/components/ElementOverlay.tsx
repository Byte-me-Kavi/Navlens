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

// Helper function to generate a valid CSS selector for an element
function getElementSelector(el: HTMLElement): string {
  if (!el || el.tagName === "BODY" || el.tagName === "HTML") return "";
  if (el.id) return `#${CSS.escape(el.id)}`;

  let selector = el.tagName;
  if (el.className && typeof el.className === "string") {
    const classes = el.className
      .trim()
      .split(/\s+/)
      .filter((c) => c && !c.includes("navlens"))
      .map((c) => CSS.escape(c)); // Escape special characters
    if (classes.length > 0) {
      selector += `.${classes.join(".")}`;
    }
  }

  const parent = el.parentElement;
  if (!parent || parent.tagName === "BODY") return selector;

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName === el.tagName
  );
  if (siblings.length > 1) {
    const index = siblings.indexOf(el) + 1;
    selector += `:nth-of-type(${index})`;
  }

  return selector;
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

  // Check iframe readiness with proper wait for DOM
  useEffect(() => {
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
      console.log("⏳ Element overlay waiting for iframe to be ready...");
      setIframeReady(false);
      return;
    }

    // Wait for iframe DOM to be fully constructed
    const checkReady = () => {
      const doc = iframe.contentDocument;
      if (!doc || !doc.body || !doc.documentElement) {
        return false;
      }

      // Check if iframe has actual content
      const hasContent =
        doc.body.children.length > 0 || doc.documentElement.scrollHeight > 0;

      return hasContent;
    };

    let attempts = 0;
    const maxAttempts = 10;

    const waitForReady = () => {
      if (checkReady()) {
        console.log("✓ Iframe ready for element overlays");
        setIframeReady(true);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(waitForReady, 100);
      } else {
        console.warn("⚠️ Iframe readiness check timed out");
        setIframeReady(true); // Proceed anyway
      }
    };

    waitForReady();
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

    // Clear previous element highlights in iframe
    const existingHighlights = iframe.contentDocument.querySelectorAll(
      ".navlens-element-highlight"
    );
    existingHighlights.forEach((el) => el.remove());

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
    elements.forEach((clickData, index) => {
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

      // Try to find and highlight the actual DOM element
      // Only highlight important clickable elements (not generic divs/body)
      const isImportantElement = [
        "BUTTON",
        "A",
        "INPUT",
        "SELECT",
        "TEXTAREA",
        "IMG",
        "SVG",
        "VIDEO",
        "AUDIO",
        "LABEL",
        "FORM",
        "NAV",
        "HEADER",
        "FOOTER",
      ].includes(clickData.tag.toUpperCase());

      if (
        clickData.selector &&
        iframe.contentDocument &&
        iframe.contentWindow &&
        isImportantElement
      ) {
        try {
          const targetElement = iframe.contentDocument.querySelector(
            clickData.selector
          );
          if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const iframeRect = iframe.getBoundingClientRect();

            // Create element highlight in the overlay container
            const elementHighlight = document.createElement("div");
            elementHighlight.className = "navlens-element-highlight";
            elementHighlight.style.position = "absolute";
            elementHighlight.style.left = `${
              rect.left + iframe.contentWindow.scrollX
            }px`;
            elementHighlight.style.top = `${
              rect.top + iframe.contentWindow.scrollY
            }px`;
            elementHighlight.style.width = `${rect.width}px`;
            elementHighlight.style.height = `${rect.height}px`;
            elementHighlight.style.border = "3px solid rgba(255, 50, 50, 0.9)";
            elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.15)";
            elementHighlight.style.pointerEvents = "auto";
            elementHighlight.style.cursor = "pointer";
            elementHighlight.style.zIndex = "99";
            elementHighlight.style.borderRadius = "4px";
            elementHighlight.style.boxShadow =
              "0 0 15px rgba(255, 50, 50, 0.7), inset 0 0 10px rgba(255, 50, 50, 0.25)";
            elementHighlight.style.transition = "all 0.3s ease";

            // Add click handler to open modal
            elementHighlight.addEventListener("click", (e) => {
              e.stopPropagation();
              console.log("👁️ Opening analysis for:", clickData);
              setSelectedElement(clickData);
            });

            // Add hover effect
            elementHighlight.addEventListener("mouseenter", () => {
              elementHighlight.style.backgroundColor =
                "rgba(255, 50, 50, 0.25)";
              elementHighlight.style.boxShadow =
                "0 0 20px rgba(255, 50, 50, 0.9), inset 0 0 15px rgba(255, 50, 50, 0.35)";
            });

            elementHighlight.addEventListener("mouseleave", () => {
              elementHighlight.style.backgroundColor =
                "rgba(255, 50, 50, 0.15)";
              elementHighlight.style.boxShadow =
                "0 0 15px rgba(255, 50, 50, 0.7), inset 0 0 10px rgba(255, 50, 50, 0.25)";
            });

            // Add label showing element info
            const label = document.createElement("div");
            label.style.cssText = `
              position: absolute;
              top: -25px;
              left: 0;
              background: linear-gradient(135deg, #FF3232, #CC0000);
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              pointer-events: none;
            `;
            label.textContent = `${clickData.tag.toUpperCase()} (${
              clickData.clickCount
            } clicks)`;
            elementHighlight.appendChild(label);

            container.appendChild(elementHighlight);

            console.log(`✨ Highlighted element: ${clickData.selector}`);
          }
        } catch (error) {
          console.warn(
            `⚠️ Could not find element with selector: ${clickData.selector}`,
            error
          );
        }
      }

      // Note: We don't add blue circle markers - let the heatmap show density
      // The element borders (red/blue) are sufficient for element identification
    });

    // NOW: Find ALL important elements on the page and highlight non-clicked ones in blue
    if (iframe.contentDocument && iframe.contentWindow) {
      try {
        // Get all important elements from the page
        const importantSelectors = [
          "button",
          "a",
          "input",
          "select",
          "textarea",
          "img",
          "svg",
          "video",
          "audio",
          "label",
          "form",
          "nav",
          "header",
          "footer",
        ];

        const allImportantElements = iframe.contentDocument.querySelectorAll(
          importantSelectors.join(", ")
        );

        // Get set of clicked element selectors for comparison
        const clickedSelectors = new Set(
          elements.map((el) => el.selector).filter(Boolean)
        );

        console.log(
          `🔍 Found ${allImportantElements.length} important elements, ${clickedSelectors.size} clicked`
        );

        // Highlight non-clicked important elements in blue
        allImportantElements.forEach((element) => {
          // Generate selector for this element
          const elementSelector = getElementSelector(element as HTMLElement);

          // Skip if this element was clicked (already has red highlight)
          if (clickedSelectors.has(elementSelector)) {
            return;
          }

          const rect = element.getBoundingClientRect();

          // Skip if element is not visible or too small
          if (rect.width < 10 || rect.height < 10) {
            return;
          }

          // Create blue highlight for non-clicked element
          const elementHighlight = document.createElement("div");
          elementHighlight.className = "navlens-element-highlight non-clicked";
          elementHighlight.style.position = "absolute";
          elementHighlight.style.left = `${
            rect.left + iframe.contentWindow!.scrollX
          }px`;
          elementHighlight.style.top = `${
            rect.top + iframe.contentWindow!.scrollY
          }px`;
          elementHighlight.style.width = `${rect.width}px`;
          elementHighlight.style.height = `${rect.height}px`;
          elementHighlight.style.border = "2px solid rgba(0, 100, 200, 0.6)";
          elementHighlight.style.backgroundColor = "rgba(0, 100, 200, 0.08)";
          elementHighlight.style.pointerEvents = "none";
          elementHighlight.style.zIndex = "98";
          elementHighlight.style.borderRadius = "4px";
          elementHighlight.style.boxShadow = "0 0 8px rgba(0, 100, 200, 0.4)";
          elementHighlight.style.transition = "all 0.3s ease";

          container.appendChild(elementHighlight);
        });

        console.log(
          `✓ Highlighted ${
            allImportantElements.length - clickedSelectors.size
          } non-clicked elements in blue`
        );
      } catch (error) {
        console.warn("⚠️ Could not highlight non-clicked elements:", error);
      }
    }

    console.log(
      `✓ Rendered ${elements.length} clicked element highlights (red) and non-clicked elements (blue)`
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
          zIndex: 100,
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
