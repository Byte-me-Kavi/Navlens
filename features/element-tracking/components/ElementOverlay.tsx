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

    // Step 1: Find ALL important elements on the page
    if (!iframe.contentDocument || !iframe.contentWindow) {
      return;
    }

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
    ];

    const allImportantElements = iframe.contentDocument.querySelectorAll(
      importantSelectors.join(", ")
    );

    console.log(`🔍 Found ${allImportantElements.length} important elements`);

    // Step 2: For each element, check if ANY click happened inside its bounds
    const scrollX = iframe.contentWindow.scrollX || 0;
    const scrollY = iframe.contentWindow.scrollY || 0;

    allImportantElements.forEach((element) => {
      const rect = element.getBoundingClientRect();

      // Skip invisible or zero-size elements
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      // Calculate absolute position
      const elementLeft = rect.left + scrollX;
      const elementTop = rect.top + scrollY;
      const elementRight = elementLeft + rect.width;
      const elementBottom = elementTop + rect.height;

      // Check if ANY click from our data falls inside this element's bounds
      // Count the TOTAL clicks, not just the number of click records
      let clicksInside = 0;
      elements.forEach((clickData) => {
        const clickX = clickData.x_relative! * currentDocWidth;
        const clickY = clickData.y_relative! * currentDocHeight;

        if (
          clickX >= elementLeft &&
          clickX <= elementRight &&
          clickY >= elementTop &&
          clickY <= elementBottom
        ) {
          // Add the click count from this record (could be multiple clicks at same position)
          clicksInside += clickData.clickCount;
        }
      });

      // Create overlay for this element
      const elementHighlight = document.createElement("div");
      elementHighlight.className =
        clicksInside > 0
          ? "navlens-element-highlight clicked"
          : "navlens-element-highlight not-clicked";
      elementHighlight.style.position = "absolute";
      elementHighlight.style.left = `${elementLeft}px`;
      elementHighlight.style.top = `${elementTop}px`;
      elementHighlight.style.width = `${rect.width}px`;
      elementHighlight.style.height = `${rect.height}px`;
      elementHighlight.style.pointerEvents = "auto";
      elementHighlight.style.cursor = "pointer";
      elementHighlight.style.borderRadius = "4px";
      elementHighlight.style.transition = "all 0.3s ease";
      elementHighlight.style.zIndex = clicksInside > 0 ? "99" : "98";

      if (clicksInside > 0) {
        // RED overlay for clicked elements
        elementHighlight.style.border = "3px solid rgba(255, 50, 50, 0.9)";
        elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.15)";
        elementHighlight.style.boxShadow =
          "0 0 15px rgba(255, 50, 50, 0.7), inset 0 0 10px rgba(255, 50, 50, 0.25)";

        // Add label showing click count
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
        label.textContent = `${element.tagName} (${clicksInside} ${
          clicksInside === 1 ? "click" : "clicks"
        })`;
        elementHighlight.appendChild(label);

        // Add click handler for analysis
        elementHighlight.addEventListener("click", (e) => {
          e.stopPropagation();
          // Find the first matching click data
          const matchingClick = elements.find((clickData) => {
            const clickX = clickData.x_relative! * currentDocWidth;
            const clickY = clickData.y_relative! * currentDocHeight;
            return (
              clickX >= elementLeft &&
              clickX <= elementRight &&
              clickY >= elementTop &&
              clickY <= elementBottom
            );
          });
          if (matchingClick) {
            setSelectedElement(matchingClick);
          }
        });
      } else {
        // BLUE overlay for non-clicked elements
        elementHighlight.style.border = "2px solid rgba(59, 130, 246, 0.6)";
        elementHighlight.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
        elementHighlight.style.boxShadow =
          "0 0 10px rgba(59, 130, 246, 0.4), inset 0 0 8px rgba(59, 130, 246, 0.2)";
      }

      // Add hover effect
      elementHighlight.addEventListener("mouseenter", () => {
        if (clicksInside > 0) {
          elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.35)";
          elementHighlight.style.boxShadow =
            "0 0 20px rgba(255, 50, 50, 0.9), inset 0 0 15px rgba(255, 50, 50, 0.4)";
        } else {
          elementHighlight.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          elementHighlight.style.boxShadow =
            "0 0 15px rgba(59, 130, 246, 0.6), inset 0 0 12px rgba(59, 130, 246, 0.3)";
        }
      });

      elementHighlight.addEventListener("mouseleave", () => {
        if (clicksInside > 0) {
          elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.15)";
          elementHighlight.style.boxShadow =
            "0 0 15px rgba(255, 50, 50, 0.7), inset 0 0 10px rgba(255, 50, 50, 0.25)";
        } else {
          elementHighlight.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
          elementHighlight.style.boxShadow =
            "0 0 10px rgba(59, 130, 246, 0.4), inset 0 0 8px rgba(59, 130, 246, 0.2)";
        }
      });

      container.appendChild(elementHighlight);
    });

    console.log(`✓ Rendered ${allImportantElements.length} element overlays`);

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
      const doc = iframe.contentDocument;
      if (!doc) return;

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
    if (iframe.contentDocument) {
      resizeObserver.observe(iframe.contentDocument.documentElement);
    }

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
