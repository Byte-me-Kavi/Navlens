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
          console.log("✓ Using new format (snapshot + styles + origin)");
        } else {
          setSnapshotData(json);
          setStyles([]);
          setOrigin(window.location.origin);
          console.log("⚠️ Using old format (direct snapshot, no styles)");
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

  // 3. Rebuild the DOM with rrweb-snapshot rebuild
  useEffect(() => {
    if (!snapshotData || !iframeContainerRef.current) return;

    console.log("=== Starting DOM Rebuild with rrweb ===");
    console.log("Snapshot data:", snapshotData);

    // Deep inspection of snapshot structure for images
    const findImages = (node: any, depth = 0, path = ""): void => {
      if (!node) return;
      const indent = "  ".repeat(depth);

      if (node.tagName && node.tagName.toLowerCase() === "img") {
        console.log(`${indent}🖼️ IMG FOUND at ${path}:`, {
          tagName: node.tagName,
          attributes: node.attributes,
          textContent: node.textContent,
        });
      }

      if (node.childNodes && Array.isArray(node.childNodes)) {
        node.childNodes.forEach((child: any, i: number) => {
          findImages(child, depth + 1, `${path}[${i}]`);
        });
      }
    };

    findImages(snapshotData, 0, "root");

    // Clear previous content and set up structure
    const containerDiv = iframeContainerRef.current;
    containerDiv.innerHTML = "";

    try {
      console.log("Starting DOM reconstruction with rrweb");

      // Create an iframe wrapper to contain iframe and heatmap canvas
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
      wrapper.style.overflow = "hidden";

      // Create an iframe and set it to display the snapshot HTML
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.display = "block";
      iframe.style.position = "absolute";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.zIndex = "1";
      iframe.setAttribute(
        "sandbox",
        "allow-scripts" // Only allow scripts for DOM reconstruction, no external access
      );
      iframe.setAttribute("referrerpolicy", "no-referrer");

      wrapper.appendChild(iframe);
      containerDiv.appendChild(wrapper);
      console.log("Iframe created and appended");

      // Use rrweb-snapshot to rebuild the DOM
      // Wait for iframe to be ready (contentDocument available)
      const checkIframeReady = setInterval(() => {
        try {
          const doc = iframe.contentDocument;
          if (!doc) {
            return; // Iframe not ready yet, keep checking
          }
          clearInterval(checkIframeReady);

          // CRITICAL: Set base href to about:blank to prevent ANY external resource loading
          const baseHref = "about:blank";
          const baseTag = doc.createElement("base");
          baseTag.href = baseHref;
          doc.head?.insertBefore(baseTag, doc.head.firstChild);
          console.log(`✓ Base tag injected: ${baseHref} (completely isolated)`);

          if (!rrwebSnapshot.buildNodeWithSN) {
            console.error("rrwebSnapshot.buildNodeWithSN not available");
            fallbackManualReconstruction(doc);
            return;
          }

          // Use rrweb-snapshot's buildNodeWithSN to properly rebuild the DOM with CSS
          if (rrwebSnapshot.buildNodeWithSN) {
            console.log("Using rrwebSnapshot.buildNodeWithSN to rebuild DOM");

            // Create mirror and cache for buildNodeWithSN
            const mirror = rrwebSnapshot.createMirror();
            const cache = rrwebSnapshot.createCache();

            // Recursively build all nodes including deeply nested children
            const buildNodeRecursive = (
              node: any,
              parentElement: Element | null = null
            ): Node | null => {
              if (!node) return null;

              try {
                // Log what we're building
                if (node.tagName) {
                  console.log(`Building node: ${node.tagName.toUpperCase()}`, {
                    hasChildren: node.childNodes?.length > 0,
                    attributes: node.attributes,
                  });
                }

                // Build the current node WITHOUT auto-building children (skipChild: true)
                const element = rrwebSnapshot.buildNodeWithSN(node, {
                  doc,
                  mirror,
                  cache,
                  hackCss: true,
                  skipChild: true, // IMPORTANT: We'll handle children manually
                }) as Node;

                if (!element) return null;

                // If this is an img element, log it and trigger load
                if ((element as Element).tagName === "IMG") {
                  const imgEl = element as HTMLImageElement;
                  console.log("🖼️ Image element BUILT:", {
                    src: imgEl.getAttribute("src"),
                    srcset: imgEl.getAttribute("srcset"),
                    currentSrc: imgEl.currentSrc,
                  });

                  // Force image to load by recreating the img element with same attributes
                  // This triggers the browser's image loading mechanism
                  const newImg = doc.createElement("img");
                  Array.from(imgEl.attributes).forEach((attr) => {
                    newImg.setAttribute(attr.name, attr.value);
                  });

                  // Copy styles
                  if (imgEl.style.cssText) {
                    newImg.style.cssText = imgEl.style.cssText;
                  }

                  // Replace in DOM
                  (element as Element).parentNode?.replaceChild(
                    newImg,
                    element as Element
                  );

                  console.log("🖼️ Image recreated to trigger load:", {
                    newSrc: newImg.getAttribute("src"),
                    newSrcset: newImg.getAttribute("srcset"),
                  });

                  return newImg;
                }

                // NOW manually build and append all children
                if (node.childNodes && Array.isArray(node.childNodes)) {
                  node.childNodes.forEach((childNode: any) => {
                    const childElement = buildNodeRecursive(
                      childNode,
                      element as Element
                    );
                    if (childElement) {
                      (element as Element).appendChild(childElement);
                    }
                  });
                }

                return element;
              } catch (e) {
                console.warn("Error building node:", e);
                return null;
              }
            };

            // If snapshot is the root node
            const snapshotAsNode = snapshotData as SnapshotNode;
            if (
              snapshotAsNode.childNodes &&
              Array.isArray(snapshotAsNode.childNodes)
            ) {
              snapshotAsNode.childNodes.forEach((childNode: SnapshotNode) => {
                const builtNode = buildNodeRecursive(childNode);
                if (builtNode) {
                  if (
                    builtNode.nodeType === 1 &&
                    (builtNode as Element).tagName === "HTML"
                  ) {
                    // For HTML nodes, extract and append their children
                    const htmlElement = builtNode as Element;
                    const headChildren = Array.from(
                      htmlElement.querySelectorAll("head > *")
                    );
                    const bodyChildren = Array.from(
                      htmlElement.querySelectorAll("body > *")
                    );

                    // Move head children (but skip base tag if already added)
                    headChildren.forEach((child) => {
                      if ((child as Element).tagName !== "BASE") {
                        doc.head?.appendChild(child.cloneNode(true));
                      }
                    });

                    // Move body children
                    bodyChildren.forEach((child) => {
                      doc.body?.appendChild(child.cloneNode(true));
                    });
                  } else if (builtNode.nodeType === 1) {
                    doc.body?.appendChild(builtNode);
                  }
                }
              });
            }

            console.log(
              "✓ rrweb buildNodeWithSN completed - Base64 images embedded in DOM"
            );

            // After DOM is built, ensure Base64 images are visible
            setTimeout(() => {
              const allImages = doc.querySelectorAll("img");
              console.log(
                `Found ${allImages.length} Base64 IMG elements in iframe DOM`
              );
              allImages.forEach((img, i) => {
                // Base64 images should load automatically, just ensure visibility
                img.onload = () => {
                  console.log(`✅ Base64 Image ${i} loaded successfully`);
                };
                img.onerror = () => {
                  console.warn(
                    `⚠️ Base64 Image ${i} failed to load:`,
                    img.src?.substring(0, 50)
                  );
                };
              });
            }, 500);
          } else {
            console.warn(
              "rrwebSnapshot.buildNodeWithSN not available, falling back to manual reconstruction"
            );
            fallbackManualReconstruction(doc);
          }

          // Inject CSS if available
          setTimeout(() => {
            if (styles && Array.isArray(styles) && styles.length > 0) {
              console.log("=== Injecting styles ===");
              let inlineCount = 0;
              let linkCount = 0;

              (styles as StyleObject[]).forEach(
                (styleObj: StyleObject, index: number) => {
                  if (styleObj.type === "inline" && styleObj.content) {
                    const styleTag = doc.createElement("style");
                    styleTag.textContent = styleObj.content;
                    doc.head?.appendChild(styleTag);
                    inlineCount++;
                  } else if (styleObj.type === "link" && styleObj.href) {
                    const linkTag = doc.createElement("link");
                    linkTag.rel = "stylesheet";
                    linkTag.href = styleObj.href;
                    doc.head?.appendChild(linkTag);
                    linkCount++;
                  }
                }
              );

              console.log(
                `✓ Injected ${inlineCount} inline styles and ${linkCount} external stylesheets`
              );
            }

            // 5. Inject "Force Visibility" Styles (The Magic Fix)
            const visibilityStyle = doc.createElement("style");
            visibilityStyle.textContent = `
                /* 1. Reset Layout & Scroll */
                * { box-sizing: border-box; }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: auto;
                    overflow-x: hidden;
                    font-family: system-ui, -apple-system, sans-serif;
                }

                /* 2. NUCLEAR OPTION: Stop Animations & Force Visibility */
                /* This overrides opacity:0 from scroll libraries like AOS, Framer Motion, etc. */

                [data-aos],
                .aos-animate,
                [data-scroll],
                .reveal,
                .fade-in,
                .lazyload,
                .lazyloaded,
                [style*="opacity: 0"],
                [style*="opacity:0"] {
                    opacity: 1 !important;
                    visibility: visible !important;
                    transform: none !important; /* Reset slide-in transforms */
                    transition: none !important;
                    animation: none !important;
                }

                /* 3. Block all external resources - iframe should only show embedded content */
                img:not([src^="data:"]) {
                    display: none !important; /* Hide any non-embedded images */
                }
                link[rel="stylesheet"]:not([href^="data:"]) {
                    display: none !important; /* Hide external stylesheets */
                }
                script:not([src^="data:"]) {
                    display: none !important; /* Hide external scripts */
                }
            `;
            doc.head?.appendChild(visibilityStyle);
            console.log("✓ Applied Force-Visibility styles");

            // 6. Images are now embedded as Base64 - minimal handling needed
            const images = doc.querySelectorAll("img");
            images.forEach((img) => {
              // Base64 images should load automatically, just ensure they're visible
              img.setAttribute("loading", "eager");
              img.setAttribute("decoding", "sync");
            });
            console.log(`✓ Base64 images ready: ${images.length} images`);

            // 7. AGGRESSIVE BLOCKING - Prevent ANY external resource loading
            const navigationBlocker = doc.createElement("script");
            navigationBlocker.textContent = `
              // Override fetch and XMLHttpRequest to block external requests
              const originalFetch = window.fetch;
              window.fetch = function() {
                console.log('Blocked fetch request');
                return Promise.reject(new Error('External requests blocked'));
              };

              const originalXMLHttpRequest = window.XMLHttpRequest;
              window.XMLHttpRequest = function() {
                console.log('Blocked XMLHttpRequest');
                throw new Error('External requests blocked');
              };

              // Block all external navigation and form submissions
              document.addEventListener('click', function(e) {
                const target = e.target.closest('a');
                if (target && target.href) {
                  console.log('Blocked link click to:', target.href);
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              }, true);

              // Block form submissions
              document.addEventListener('submit', function(e) {
                console.log('Blocked form submission');
                e.preventDefault();
                return false;
              }, true);

              // Block programmatic navigation
              const originalAssign = window.location.assign;
              const originalReplace = window.location.replace;
              const originalHref = window.location.href;

              window.location.assign = function(url) {
                console.log('Blocked location.assign to:', url);
              };
              window.location.replace = function(url) {
                console.log('Blocked location.replace to:', url);
              };

              Object.defineProperty(window.location, 'href', {
                get: function() { return originalHref; },
                set: function(url) {
                  console.log('Blocked location.href assignment to:', url);
                }
              });

              // Block dynamic script/style loading
              const originalCreateElement = document.createElement;
              document.createElement = function(tagName) {
                const element = originalCreateElement.call(document, tagName);
                if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'link') {
                  // Monitor for external src/href
                  const setter = Object.getOwnPropertyDescriptor(Element.prototype, tagName === 'script' ? 'src' : 'href')?.set;
                  if (setter) {
                    Object.defineProperty(element, tagName === 'script' ? 'src' : 'href', {
                      set: function(value) {
                        if (value && (value.startsWith('http') || value.startsWith('//'))) {
                          console.log('Blocked external', tagName, 'loading:', value);
                          return;
                        }
                        setter.call(this, value);
                      }
                    });
                  }
                }
                return element;
              };

              console.log('✓ Aggressive external resource blocking active');
            `;
            doc.head?.appendChild(navigationBlocker);
            console.log("✓ Injected aggressive resource blocker script");
          }, 1000);
        } catch (e) {
          console.error("Error in rrweb rebuild:", e);
          const doc = iframe.contentDocument;
          if (doc) fallbackManualReconstruction(doc);
        }
      }, 100); // Check every 100ms

      // Fallback manual reconstruction function
      const fallbackManualReconstruction = (doc: Document | null) => {
        if (!doc) return;

        interface SnapshotNode {
          type: number;
          tagName?: string;
          attributes?: Record<string, unknown>;
          childNodes?: SnapshotNode[];
          textContent?: string;
        }

        const nodeToHTML = (sn: SnapshotNode): string => {
          if (sn.type === 0) return "";
          if (sn.type === 1) return "<!DOCTYPE html>";
          if (sn.type === 2) {
            const tagName = sn.tagName?.toLowerCase();
            if (tagName === "script") return "";
            if (tagName === "link" && sn.attributes?.rel === "stylesheet")
              return "";

            let html = `<${sn.tagName}`;
            if (sn.attributes) {
              Object.entries(sn.attributes).forEach(([key, value]) => {
                const attrValue =
                  typeof value === "string" ? value : JSON.stringify(value);
                const escaped = attrValue
                  .replace(/"/g, "&quot;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
                html += ` ${key}="${escaped}"`;
              });
            }
            html += ">";

            if (sn.childNodes && Array.isArray(sn.childNodes)) {
              sn.childNodes.forEach((child) => {
                html += nodeToHTML(child);
              });
            }

            const voidElements = ["br", "hr", "img", "input", "meta", "link"];
            if (
              sn.tagName &&
              !voidElements.includes(sn.tagName.toLowerCase())
            ) {
              html += `</${sn.tagName}>`;
            }
            return html;
          }
          if (sn.type === 3) {
            return (sn.textContent || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
          }
          return "";
        };

        let htmlContent = "";
        const snapshotAsAny = snapshotData as SnapshotNode;
        if (
          snapshotAsAny.childNodes &&
          Array.isArray(snapshotAsAny.childNodes)
        ) {
          snapshotAsAny.childNodes.forEach((child) => {
            htmlContent += nodeToHTML(child);
          });
        }

        const baseHref = origin || window.location.origin;
        const headCloseIndex = htmlContent.indexOf("</head>");
        if (headCloseIndex !== -1) {
          htmlContent =
            htmlContent.slice(0, headCloseIndex) +
            `<base href="${baseHref}">` +
            htmlContent.slice(headCloseIndex);
        }

        doc.open();
        doc.write(htmlContent);
        doc.close();

        console.log("✓ Fallback manual reconstruction completed");
      };

      // Initialize Heatmap overlay for all clicks
      setTimeout(() => {
        const canvasContainer = document.createElement("div");
        canvasContainer.id = "heatmap-canvas-container";
        canvasContainer.style.position = "absolute";
        canvasContainer.style.top = "0";
        canvasContainer.style.left = "0";
        canvasContainer.style.width = "100%";
        canvasContainer.style.height = "100%";
        canvasContainer.style.zIndex = "2";
        canvasContainer.style.pointerEvents = "none";

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
        console.log("Heatmap instance created for all clicks");

        // Create element click overlay on top of heatmap
        const overlayContainer = document.createElement("div");
        overlayContainer.id = "element-click-overlay";
        overlayContainer.style.position = "absolute";
        overlayContainer.style.top = "0";
        overlayContainer.style.left = "0";
        overlayContainer.style.width = "100%";
        overlayContainer.style.height = "100%";
        overlayContainer.style.zIndex = "3"; // Above heatmap
        overlayContainer.style.pointerEvents = "none";

        wrapper.appendChild(overlayContainer);
        console.log("Element click overlay container created");
      }, 200);
    } catch (error) {
      console.error("ERROR during DOM reconstruction:", error);
      console.error("Stack:", (error as Error).stack);
    }
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

    if (!heatmapInstance) return;

    // Only render heatmap for clicks data type
    if (dataType === "clicks" || dataType === "both") {
      if (clickData.length === 0) {
        console.log("No click data to render heatmap");
        return;
      }

      const heatmapData = {
        max: Math.max(...clickData.map((d) => d.value)),
        data: clickData.map((point) => ({
          x: point.x,
          y: point.y,
          value: point.value,
        })),
      };

      console.log("Setting heatmap data:", heatmapData);
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
