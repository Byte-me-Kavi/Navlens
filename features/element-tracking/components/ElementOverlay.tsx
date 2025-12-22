/**
 * ElementOverlay Component
 *
 * Renders clickable element overlays
 */

"use client";

import { useEffect, useState, useRef } from "react";
import type { ElementClick } from "../types/element.types";
import type { HeatmapPoint } from "../../heatmap/types/heatmap.types";
import { ElementAnalysisModal } from "./ElementAnalysisModal";

interface ElementOverlayProps {
  elements: ElementClick[];
  iframe: HTMLIFrameElement | null;
  siteId: string;
  pagePath: string;
  deviceType: string;
  onOverlaysRendered?: () => void;
  heatmapClicks?: HeatmapPoint[];
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
  heatmapClicks = [],
}: ElementOverlayProps) {
  const [selectedElement, setSelectedElement] = useState<ElementClick | null>(
    null
  );
  // State for masking fixed elements
  const [fixedRects, setFixedRects] = useState<Array<{left: number, top: number, width: number, height: number}>>([]);
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
    const fixedContainer = document.getElementById("fixed-element-overlay-container");

    if (!container) {
      console.warn("⚠️ Element overlay container not found");
      return;
    }

    // Clear previous overlays
    container.innerHTML = "";
    if (fixedContainer) fixedContainer.innerHTML = "";

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
      "header",
      "nav", 
      "div[class*='nav']",
      "div[class*='header']",
      "div[class*='sticky']",
      "div[class*='fixed']"
    ];

    const allImportantElements = iframe.contentDocument.querySelectorAll(
      importantSelectors.join(", ")
    );

    console.log(`🔍 Found ${allImportantElements.length} important elements`);

    // Step 2: For each element, check if it matches any clicked element by selector
    const scrollX = iframe.contentWindow.scrollX || 0;
    const scrollY = iframe.contentWindow.scrollY || 0;

    // Calculate total clicks on page for percentage
    const totalPageClicks = heatmapClicks.reduce((sum, p) => sum + p.value, 0);

    // Store rects for masking
    const newFixedRects: Array<{left: number, top: number, width: number, height: number}> = [];

    allImportantElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      // Check if element OR ANY PARENT is fixed/sticky
      let isFixed = false;
      let currentEl: HTMLElement | null = element as HTMLElement;
      const iframeWindow = iframe.contentWindow;
      while (currentEl && currentEl.tagName !== 'BODY' && currentEl.tagName !== 'HTML') {
        // Use iframe's window for getComputedStyle, not parent window
        const s = iframeWindow?.getComputedStyle(currentEl);
        if (s?.position === 'fixed' || s?.position === 'sticky') {
          isFixed = true;
          break;
        }
        currentEl = currentEl.parentElement;
      }

      // Skip invisible or zero-size elements
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      // If fixed, collect rect for masking
      if (isFixed) {
          newFixedRects.push({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
          });
      }

      // Generate selector for this element
      const elementSelector = getElementSelector(element as HTMLElement);

      // COORDINATE CALCULATION:
      // Fixed elements: Absolute to viewport (rect.left/top) - use fixed container
      // Normal elements: Absolute to document (rect + scroll) - use scroll container
      const elementLeft = isFixed ? rect.left : rect.left + scrollX;
      const elementTop = isFixed ? rect.top : rect.top + scrollY;

      // Count clicks that fall within this element's bounding box
      let clicksInside = 0;
      heatmapClicks.forEach((click) => {
        // Skip clicks that don't have relative coordinates defined (undefined/null)
        // Allow 0 values as they are valid coordinates for top-left area
        if (click.x_relative === undefined || click.x_relative === null || 
            click.y_relative === undefined || click.y_relative === null) return;

        const clickX = click.x_relative * currentDocWidth;
        const clickY = click.y_relative * currentDocHeight;

        // MATCHING LOGIC:
        // Always compare click position (Document coords) vs Element position (Document coords)
        const elDocLeft = rect.left + scrollX;
        const elDocTop = rect.top + scrollY;

        if (
          clickX >= elDocLeft &&
          clickX <= elDocLeft + rect.width &&
          clickY >= elDocTop &&
          clickY <= elDocTop + rect.height
        ) {
          clicksInside += click.value;
        }
      });

      // Create visual overlay for this element
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
      elementHighlight.style.pointerEvents = "none"; // Allow scroll/clicks to pass through
      elementHighlight.style.cursor = "pointer";
      elementHighlight.style.borderRadius = "4px";
      elementHighlight.style.transition = "all 0.3s ease";
      
      // Ensure fixed elements are visually above normal ones
      const baseZ = isFixed ? 1000 : 98;
      elementHighlight.style.zIndex = clicksInside > 0 ? `${baseZ + 1}` : `${baseZ}`;

      // Create invisible interactive overlay for clicks/scrolls
      const clickOverlay = document.createElement("div");
      clickOverlay.style.position = "absolute";
      clickOverlay.style.left = `${elementLeft}px`;
      clickOverlay.style.top = `${elementTop}px`;
      clickOverlay.style.width = `${rect.width}px`;
      clickOverlay.style.height = `${rect.height}px`;
      clickOverlay.style.pointerEvents = "auto";
      clickOverlay.style.cursor = "pointer";
      clickOverlay.style.zIndex = `${baseZ + 2}`; // Above highlight

      // Add wheel event handler to forward scroll events to iframe
      clickOverlay.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault(); // Prevent default to avoid double-scrolling
          // Pass scroll to iframe
          if (iframe?.contentWindow) {
            iframe.contentWindow.scrollBy({
              top: e.deltaY * 2,
              left: e.deltaX * 2,
              behavior: "instant",
            });
          }
        },
        { passive: false }
      );

      // Add click handler to the invisible overlay
      clickOverlay.addEventListener("click", (e) => {
        e.stopPropagation();
        // Create a mock ElementClick object for clicked elements
        const mockElementClick: ElementClick = {
          selector: elementSelector,
          tag: element.tagName,
          text: element.textContent || "",
          x: elementLeft,
          y: elementTop,
          x_relative: elementLeft / currentDocWidth,
          y_relative: elementTop / currentDocHeight,
          document_width: currentDocWidth,
          document_height: currentDocHeight,
          width: rect.width,
          height: rect.height,
          clickCount: clicksInside,
          percentage: totalPageClicks > 0 ? (clicksInside / totalPageClicks) * 100 : 0,
        };
        setSelectedElement(mockElementClick);
      });

      // Append to the correct container
      if (isFixed && fixedContainer) {
        fixedContainer.appendChild(elementHighlight);
        fixedContainer.appendChild(clickOverlay);
      } else {
        container.appendChild(elementHighlight);
        container.appendChild(clickOverlay);
      }

      if (clicksInside > 0) {
        // RED overlay for clicked elements (reduced intensity)
        elementHighlight.style.border = "2px solid rgba(255, 50, 50, 0.7)";
        elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.12)";
        elementHighlight.style.boxShadow =
          "0 0 10px rgba(255, 50, 50, 0.5), inset 0 0 6px rgba(255, 50, 50, 0.2)";

        // Add label showing click count
        const label = document.createElement("div");
        label.style.cssText = `
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #FF3232, #CC0000);
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          pointer-events: none;
        `;
        label.textContent = `${clicksInside}`;
        elementHighlight.appendChild(label);
      } else {
        // BLUE overlay for non-clicked elements
        elementHighlight.style.border = "2px solid rgba(59, 130, 246, 0.6)";
        elementHighlight.style.backgroundColor = "rgba(59, 130, 246, 0.08)";
        elementHighlight.style.boxShadow =
          "0 0 8px rgba(59, 130, 246, 0.4), inset 0 0 5px rgba(59, 130, 246, 0.15)";
      }

      // Add hover effect
      elementHighlight.addEventListener("mouseenter", () => {
        if (clicksInside > 0) {
          elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.18)";
          elementHighlight.style.boxShadow =
            "0 0 14px rgba(255, 50, 50, 0.7), inset 0 0 8px rgba(255, 50, 50, 0.25)";
        } else {
          elementHighlight.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
          elementHighlight.style.boxShadow =
            "0 0 12px rgba(59, 130, 246, 0.6), inset 0 0 8px rgba(59, 130, 246, 0.2)";
        }
      });

      elementHighlight.addEventListener("mouseleave", () => {
        if (clicksInside > 0) {
          elementHighlight.style.backgroundColor = "rgba(255, 50, 50, 0.12)";
          elementHighlight.style.boxShadow =
            "0 0 10px rgba(255, 50, 50, 0.5), inset 0 0 6px rgba(255, 50, 50, 0.2)";
        } else {
          elementHighlight.style.backgroundColor = "rgba(59, 130, 246, 0.08)";
          elementHighlight.style.boxShadow =
            "0 0 8px rgba(59, 130, 246, 0.4), inset 0 0 5px rgba(59, 130, 246, 0.15)";
        }
      });
    });

    console.log(`✓ Rendered ${allImportantElements.length} element overlays`);
    console.log("🔍 Container children count:", container.children.length);
    console.log(
      "🔍 First overlay style:",
      container.children[0]?.getAttribute("style")
    );

    // Update rects for masking
    setFixedRects(newFixedRects);
    
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
  }, [
    elements,
    iframe,
    iframeReady,
    onOverlaysRendered,
    siteId,
    pagePath,
    deviceType,
    heatmapClicks,
  ]);

  // Apply scaling to match iframe display size (removed - conflicts with ScrollSync)
  useEffect(() => {
    if (!iframe || !iframeReady) return;

    const container = document.getElementById("element-overlay-container");
    if (!container) return;

    // Don't apply transform here - ScrollSync handles positioning
    console.log("🔍 Element overlay container ready for ScrollSync");
  }, [iframe, iframeReady, deviceType, pagePath, siteId]);

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

       {/* Fixed element container - No ScrollSync transformation applied */}
      <div
        id="fixed-element-overlay-container"
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          zIndex: 1000,
          transformOrigin: "top left",
          width: '100%',
          height: '100%',
          overflow: 'hidden'
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
