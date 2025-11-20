"use client";
import { useEffect, useRef, useState } from "react";
import h337 from "heatmap.js";
import * as rrwebSnapshot from "rrweb-snapshot";

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
}: DomHeatmapViewerProps) {
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [snapshotData, setSnapshotData] = useState<unknown>(null);
  const [styles, setStyles] = useState<unknown[]>([]);
  const [origin, setOrigin] = useState<string>("");
  const [clickData, setClickData] = useState<ClickData[]>([]);
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
        const response = await fetch(
          `/api/heatmap-clicks?siteId=${encodeURIComponent(
            siteId
          )}&pagePath=${encodeURIComponent(
            pagePath
          )}&deviceType=${encodeURIComponent(deviceType)}`
        );

        if (!response.ok) {
          console.error("Failed to fetch click data:", response.status);
          return;
        }

        const data = await response.json();
        setClickData(data.clicks || []);
      } catch (error) {
        console.error("Error fetching click data:", error);
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
        "allow-same-origin allow-scripts allow-popups"
      );
      iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");

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

          // Inject <base> tag FIRST before any reconstruction
          const baseHref = origin || window.location.origin;
          const baseTag = doc.createElement("base");
          baseTag.href = baseHref;
          doc.head?.insertBefore(baseTag, doc.head.firstChild);
          console.log(`✓ Base tag injected: ${baseHref}`);

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
              "✓ rrweb buildNodeWithSN completed - images should now be in DOM"
            );

            // After DOM is built, check for images and fix visibility
            setTimeout(() => {
              const allImages = doc.querySelectorAll("img");
              console.log(
                `Found ${allImages.length} IMG elements in iframe DOM`
              );
              allImages.forEach((img, i) => {
                // Remove the "color: transparent" inline style that Next.js Image sets
                // This style is used during loading but prevents images from showing
                const currentStyle = img.getAttribute("style");
                if (
                  currentStyle &&
                  currentStyle.includes("color: transparent")
                ) {
                  const newStyle = currentStyle.replace(
                    /color:\s*transparent;?\s*/g,
                    ""
                  );
                  if (newStyle.trim()) {
                    img.setAttribute("style", newStyle);
                  } else {
                    img.removeAttribute("style");
                  }
                  console.log(`✓ Removed "color: transparent" from image ${i}`);
                }

                // FIX: Handle Next.js Image loading issues in iframe
                // 1. Force eager loading to bypass lazy loading issues in iframe
                img.setAttribute("loading", "eager");
                img.removeAttribute("decoding");
                // Set referrer policy to avoid blocking by the source server
                img.setAttribute("referrerpolicy", "no-referrer");

                // 2. Remove srcset to simplify loading and avoid resolution issues
                // Next.js images rely on srcset, but in a reconstructed iframe, it might fail
                if (img.hasAttribute("srcset")) {
                  img.removeAttribute("srcset");
                }

                // 3. Attach load/error listeners to debug
                img.onerror = () => {
                  console.error(`❌ Image ${i} failed to load:`, img.src);
                };
                img.onload = () => {
                  console.log(`✅ Image ${i} loaded successfully`);
                };

                // 4. Re-trigger load by resetting src, and bypass Next.js optimization if possible
                const src = img.getAttribute("src");
                if (src) {
                  // Check if it's a Next.js optimized image URL
                  if (src.includes("/_next/image") && src.includes("url=")) {
                    try {
                      const urlObj = new URL(src);
                      const originalUrlParam = urlObj.searchParams.get("url");
                      if (originalUrlParam) {
                        // If the original URL is relative, we need to resolve it against the origin of the current src
                        // (which is the site where the snapshot was taken)
                        let newSrc = originalUrlParam;
                        if (originalUrlParam.startsWith("/")) {
                          newSrc = urlObj.origin + originalUrlParam;
                        }

                        console.log(
                          `🔄 Attempting to bypass Next.js optimization for image ${i}:`,
                          {
                            old: src,
                            new: newSrc,
                          }
                        );

                        img.src = newSrc;
                      } else {
                        img.src = src;
                      }
                    } catch (e) {
                      console.error("Error parsing image URL:", e);
                      img.src = src;
                    }
                  } else {
                    img.src = src;
                  }
                }

                // Force image visibility by ensuring no hidden styles
                const computedStyle = window.getComputedStyle(img);
                console.log(`Image ${i}:`, {
                  src: img.getAttribute("src"),
                  srcset: img.getAttribute("srcset"),
                  tagName: img.tagName,
                  parentTag: img.parentElement?.tagName,
                  display:
                    (img as HTMLElement).style.display || computedStyle.display,
                  visibility:
                    (img as HTMLElement).style.visibility ||
                    computedStyle.visibility,
                  width: (img as HTMLElement).offsetWidth,
                  height: (img as HTMLElement).offsetHeight,
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight,
                  complete: img.complete,
                  currentSrc: img.currentSrc,
                  finalStyle: img.getAttribute("style"),
                });
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

            // Inject default styles
            const defaultStyle = doc.createElement("style");
            defaultStyle.textContent = `
                * { box-sizing: border-box; }
                html, body { 
                  margin: 0; 
                  padding: 0;
                  width: 100%;
                  height: auto;
                  overflow-x: hidden;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                img { max-width: 100%; height: auto; display: block; }
              `;
            doc.head?.appendChild(defaultStyle);
            console.log("✓ Applied default layout styles");
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

      // Initialize Heatmap overlay
      setTimeout(() => {
        const canvasContainer = document.createElement("div");
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
          radius: 30,
          maxOpacity: 0.6,
        });
        setHeatmapInstance(instance);
        console.log("Heatmap instance created");
      }, 200);
    } catch (error) {
      console.error("ERROR during DOM reconstruction:", error);
      console.error("Stack:", (error as Error).stack);
    }
  }, [snapshotData, styles, origin]);

  // 5. Render Heatmap Data
  useEffect(() => {
    if (!heatmapInstance || clickData.length === 0) return;

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
    <div
      ref={iframeContainerRef}
      className="w-full bg-white border border-gray-300"
      style={{
        height: "600px",
      }}
    />
  );
}
