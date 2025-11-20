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

interface SnapshotWithOrigin {
  snapshot?: unknown;
  styles?: unknown[];
  origin?: string;
  [key: string]: unknown;
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

        // Handle both old format (direct snapshot) and new format (snapshot + styles + origin)
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

    console.log("=== Starting DOM Rebuild ===");
    console.log("Snapshot data structure:", snapshotData);

    // Clear previous content and set up structure
    const containerDiv = iframeContainerRef.current;
    containerDiv.innerHTML = "";

    try {
      console.log("Starting DOM reconstruction with snapshot");

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

      wrapper.appendChild(iframe);
      containerDiv.appendChild(wrapper);
      console.log("Iframe created and appended");

      // Convert snapshot to HTML string and write to iframe
      setTimeout(() => {
        try {
          const doc = iframe.contentDocument;
          if (doc && snapshotData) {
            console.log("Reconstructing DOM from snapshot");

            interface SnapshotNode {
              type: number;
              tagName?: string;
              attributes?: Record<string, unknown>;
              childNodes?: SnapshotNode[];
              textContent?: string;
            }
            const snapshotAsAny = snapshotData as SnapshotNode;

            // Function to convert snapshot node to HTML string
            const nodeToHTML = (sn: SnapshotNode): string => {
              if (sn.type === 0) {
                // Document node
                return "";
              } else if (sn.type === 1) {
                // Document type node
                return "<!DOCTYPE html>";
              } else if (sn.type === 2) {
                // Element node
                // Skip problematic tags that can cause issues in iframe context
                const tagName = sn.tagName?.toLowerCase();
                if (tagName === "script" || tagName === "link") {
                  // Don't include script tags (would execute with wrong context)
                  // Don't include link tags (would load external resources with CORS issues)
                  return "";
                }

                let html = `<${sn.tagName}`;

                // Add attributes
                if (sn.attributes) {
                  Object.entries(sn.attributes).forEach(
                    ([key, value]: [string, unknown]) => {
                      try {
                        const attrValue =
                          typeof value === "string"
                            ? value
                            : JSON.stringify(value);
                        const escaped = attrValue
                          .replace(/"/g, "&quot;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;");
                        html += ` ${key}="${escaped}"`;
                      } catch (error: unknown) {
                        console.warn(`Could not add attribute ${key}`, error);
                      }
                    }
                  );
                }

                html += ">";

                // Add children
                if (sn.childNodes && Array.isArray(sn.childNodes)) {
                  sn.childNodes.forEach((child: SnapshotNode) => {
                    html += nodeToHTML(child);
                  });
                }

                // Close tag (skip void elements)
                const voidElements = [
                  "br",
                  "hr",
                  "img",
                  "input",
                  "meta",
                  "link",
                ];
                if (
                  sn.tagName &&
                  !voidElements.includes(sn.tagName.toLowerCase())
                ) {
                  html += `</${sn.tagName}>`;
                }

                return html;
              } else if (sn.type === 3) {
                // Text node
                return (sn.textContent || "")
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
              }
              return "";
            };

            // Convert entire snapshot to HTML
            let htmlContent = "";
            if (
              snapshotAsAny.childNodes &&
              Array.isArray(snapshotAsAny.childNodes)
            ) {
              snapshotAsAny.childNodes.forEach((child: SnapshotNode) => {
                htmlContent += nodeToHTML(child);
              });
            }

            // Write HTML to document
            doc.open();
            doc.write(htmlContent);
            doc.close();

            // Inject <base> tag FIRST (Critical for relative fonts/images inside CSS)
            // This tells the iframe to resolve all relative URLs relative to the client's origin
            const baseTag = doc.createElement("base");
            baseTag.href = origin || window.location.origin; // Use captured origin or fall back to current
            if (doc.head) {
              doc.head.insertBefore(baseTag, doc.head.firstChild);
              console.log(`✓ Injected <base> tag: ${baseTag.href}`);
            }

            // Wait a moment for the document to be fully parsed
            setTimeout(() => {
              console.log("Injecting styles into iframe document...");

              // Apply captured CSS from styles array (both inline and link tags)
              if (styles && Array.isArray(styles)) {
                let inlineCount = 0;
                let linkCount = 0;

                (styles as unknown[]).forEach((style: unknown) => {
                  const styleObj = style as {
                    type: string;
                    content?: string;
                    href?: string;
                  };

                  if (styleObj.type === "inline" && styleObj.content) {
                    // Inject inline CSS directly
                    const styleTag = doc.createElement("style");
                    styleTag.textContent = styleObj.content;
                    doc.head?.appendChild(styleTag);
                    inlineCount++;
                  } else if (styleObj.type === "link" && styleObj.href) {
                    // Inject link tag with absolute URL so it loads from original domain
                    const linkTag = doc.createElement("link");
                    linkTag.rel = "stylesheet";
                    linkTag.href = styleObj.href; // This is now an absolute URL
                    doc.head?.appendChild(linkTag);
                    console.log(`  → Loading external CSS: ${styleObj.href}`);
                    linkCount++;
                  }
                });

                console.log(
                  `✓ Injected ${inlineCount} inline styles and ${linkCount} external stylesheets`
                );
              }

              // Inject essential layout and display styles to ensure proper rendering
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
                img { max-width: 100%; height: auto; }
              `;
              doc.head?.appendChild(defaultStyle);
              console.log("✓ Applied default layout styles");
            }, 10);

            console.log("DOM reconstruction complete");
            console.log("HTML content length:", htmlContent.length);
            console.log("HTML preview:", htmlContent.substring(0, 500));
            console.log(
              "Iframe body HTML:",
              doc.body?.innerHTML
                ? doc.body.innerHTML.substring(0, 500)
                : "Body element not ready"
            );
          }
        } catch (e) {
          console.error("Error reconstructing DOM:", e);
          console.error("Stack:", (e as Error).stack);
        }
      }, 50);

      // Initialize Heatmap overlay
      setTimeout(() => {
        // Create a canvas container for the heatmap overlay
        const canvasContainer = document.createElement("div");
        canvasContainer.style.position = "absolute";
        canvasContainer.style.top = "0";
        canvasContainer.style.left = "0";
        canvasContainer.style.width = "100%";
        canvasContainer.style.height = "100%";
        canvasContainer.style.zIndex = "2";
        canvasContainer.style.pointerEvents = "none"; // Allow clicks to pass through

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
