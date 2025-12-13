"use client";

import { useCallback } from "react";

interface ExportOptions {
  filename?: string;
  quality?: number;
  backgroundColor?: string;
}

/**
 * Hook for exporting heatmap canvas to PNG image
 */
export function useHeatmapExport() {
  const exportToPng = useCallback(
    async (
      canvasContainer: HTMLElement | null,
      snapshotIframe: HTMLIFrameElement | null,
      options: ExportOptions = {}
    ): Promise<boolean> => {
      const {
        filename = `heatmap-${Date.now()}.png`,
        quality = 1.0,
        backgroundColor = "#ffffff",
      } = options;

      try {
        // Find the heatmap canvas
        const heatmapCanvas = canvasContainer?.querySelector("canvas");
        if (!heatmapCanvas) {
          console.error("[HeatmapExport] Canvas not found");
          return false;
        }

        // Get snapshot dimensions
        const iframeDoc = snapshotIframe?.contentDocument;
        if (!iframeDoc) {
          console.error("[HeatmapExport] Snapshot iframe not available");
          return false;
        }

        const snapshotWidth = iframeDoc.documentElement.scrollWidth || 1920;
        const snapshotHeight = iframeDoc.documentElement.scrollHeight || 1080;

        // Create export canvas
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = snapshotWidth;
        exportCanvas.height = snapshotHeight;
        const ctx = exportCanvas.getContext("2d");
        if (!ctx) return false;

        // Fill background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, snapshotWidth, snapshotHeight);

        // Capture iframe content using html2canvas if available
        // Fallback: just draw the heatmap overlay
        try {
          // Try to draw heatmap canvas at the same size
          ctx.drawImage(heatmapCanvas, 0, 0, snapshotWidth, snapshotHeight);
        } catch (e) {
          console.error("[HeatmapExport] Failed to draw canvas:", e);
        }

        // Convert to blob and download
        return new Promise((resolve) => {
          exportCanvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(false);
                return;
              }

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              resolve(true);
            },
            "image/png",
            quality
          );
        });
      } catch (error) {
        console.error("[HeatmapExport] Export failed:", error);
        return false;
      }
    },
    []
  );

  return { exportToPng };
}

/**
 * Export button component for heatmap
 */
export function ExportHeatmapButton({
  onClick,
  loading = false,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      {loading ? "Exporting..." : "Export PNG"}
    </button>
  );
}
