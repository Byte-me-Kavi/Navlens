"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react"; 
import { apiClient } from "@/shared/services/api/client"; 
import { HeatmapViewer } from "@/features/heatmap/components/HeatmapViewer";

interface ReportGeneratorProps {
  siteId: string;
  topPages?: string[]; // Optional - will fetch if not provided
}

interface HeatmapClick {
  x_relative: number;
  y_relative: number;
  value: number;
}

export function ReportGenerator({ siteId, topPages }: ReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "capturing" | "generating" | "downloading" | "error">("idle");
  const [progress, setProgress] = useState(0); 
  const [currentPath, setCurrentPath] = useState("");

  const captureContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Generate a heatmap visualization on canvas
   * This creates a proper heatmap image with:
   * - Gradient background representing a webpage
   * - Heatmap dots overlaid with proper coloring
   */
  const generateHeatmapImage = useCallback(async (pagePath: string): Promise<string | null> => {
    try {
      console.log('[ReportGenerator] Generating heatmap image for:', pagePath);

      // 1. Fetch heatmap clicks
      const clicksRes = await fetch('/api/heatmap-clicks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          pagePath,
          deviceType: 'desktop',
          dateRangeDays: 30
        })
      });

      let clicks: HeatmapClick[] = [];
      if (clicksRes.ok) {
        const clicksData = await clicksRes.json();
        clicks = clicksData.clicks || [];
        console.log('[ReportGenerator] Loaded', clicks.length, 'heatmap clicks');
      }

      // 2. Create canvas
      const canvas = document.createElement('canvas');
      const width = 1280;
      const height = 800;
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 3. Draw webpage-like background
      // Header bar
      ctx.fillStyle = '#1f2937'; // Dark header
      ctx.fillRect(0, 0, width, 60);
      
      // Navigation dots
      ctx.fillStyle = '#6366f1';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(50 + i * 100, 30, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Content area background  
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 60, width, height - 60);

      // Hero section
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(40, 80, width - 80, 200);
      
      // Placeholder boxes to simulate content
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(40, 300, 380, 180);
      ctx.fillRect(450, 300, 380, 180);
      ctx.fillRect(860, 300, 380, 180);
      
      // More content sections
      ctx.fillRect(40, 500, width - 80, 100);
      ctx.fillRect(40, 620, 600, 150);
      ctx.fillRect(670, 620, 570, 150);

      // Page path label
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Page: ${pagePath}`, 60, 140);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${clicks.length} click interactions recorded`, 60, 170);

      // 4. Draw heatmap overlay
      if (clicks.length > 0) {
        const maxValue = Math.max(...clicks.map(c => c.value));
        
        // Sort by value so higher intensity draws on top
        const sortedClicks = [...clicks].sort((a, b) => a.value - b.value);
        
        sortedClicks.forEach(click => {
          const x = click.x_relative * width;
          const y = click.y_relative * height;
          const intensity = click.value / maxValue;
          const radius = 20 + intensity * 40;
          
          // Create radial gradient for heatmap effect
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          
          // Color based on intensity (blue -> green -> yellow -> red)
          let innerColor: string;
          let alpha = 0.4 + intensity * 0.5;
          
          if (intensity < 0.25) {
            innerColor = `rgba(59, 130, 246, ${alpha})`; // Blue
          } else if (intensity < 0.5) {
            innerColor = `rgba(34, 197, 94, ${alpha})`; // Green
          } else if (intensity < 0.75) {
            innerColor = `rgba(234, 179, 8, ${alpha})`; // Yellow
          } else {
            innerColor = `rgba(239, 68, 68, ${alpha})`; // Red
          }
          
          gradient.addColorStop(0, innerColor);
          gradient.addColorStop(0.5, innerColor.replace(String(alpha), String(alpha * 0.5)));
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
        
        ctx.globalCompositeOperation = 'source-over';
      }

      // 5. Add legend
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(width - 200, height - 80, 180, 60);
      ctx.strokeStyle = '#e5e7eb';
      ctx.strokeRect(width - 200, height - 80, 180, 60);
      
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#374151';
      ctx.fillText('Click Intensity', width - 190, height - 60);
      
      // Legend gradient
      const legendGradient = ctx.createLinearGradient(width - 190, 0, width - 40, 0);
      legendGradient.addColorStop(0, '#3b82f6');
      legendGradient.addColorStop(0.33, '#22c55e');
      legendGradient.addColorStop(0.66, '#eab308');
      legendGradient.addColorStop(1, '#ef4444');
      ctx.fillStyle = legendGradient;
      ctx.fillRect(width - 190, height - 50, 160, 15);
      
      ctx.font = '10px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Low', width - 190, height - 28);
      ctx.fillText('High', width - 60, height - 28);

      // 6. Convert to data URL
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      console.log('[ReportGenerator] Heatmap image generated');
      
      return dataUrl;

    } catch (error) {
      console.error('[ReportGenerator] Heatmap generation error:', error);
      return null;
    }
  }, [siteId]);

  const startGeneration = async () => {
    setIsOpen(true);
    setStatus("capturing");
    setProgress(0);

    const heatmapImages: Record<string, string> = {};

    try {
      // 0. Fetch Top Pages if not provided
      let pagesToCapture = topPages || [];
      if (pagesToCapture.length === 0) {
          const statsRes = await apiClient.get<any>(`/dashboard-stats?siteId=${siteId}`);
          if (statsRes.topPages) {
              pagesToCapture = statsRes.topPages.map((p: any) => p.path);
          } else {
             pagesToCapture = ['/'];
          }
      }

      // Limit to top 5
      pagesToCapture = pagesToCapture.slice(0, 5);

      // 1. Generate Heatmap Images
      for (let i = 0; i < pagesToCapture.length; i++) {
        const path = pagesToCapture[i];
        setCurrentPath(path);
        
        // Generate heatmap image
        const dataUrl = await generateHeatmapImage(path);

        if (dataUrl) {
          heatmapImages[path] = dataUrl;
        }

        setProgress(Math.round(((i + 1) / pagesToCapture.length) * 50));
      }

      // 2. Send to Server
      setStatus("generating");
      setCurrentPath("");
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            siteId,
            heatmapImages
        })
      });

      if (!response.ok) throw new Error("Report generation failed");

      // 3. Download
      setStatus("downloading");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Navlens-Report-${siteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
      setStatus("idle");

    } catch (error) {
      console.error("Report generation error:", error);
      setStatus("error");
    }
  };

  return (
    <>
      <button 
        onClick={startGeneration}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium"
      >
        <span>📄</span> Download Full Report
      </button>

      {/* Progress Dialog */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Generating Report
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-4">
                      {status === "capturing" && currentPath && `Generating heatmap for: ${currentPath}`}
                      {status === "generating" && "Compiling PDF Report..."}
                      {status === "downloading" && "Downloading file..."}
                      {status === "error" && "An error occurred. Please try again."}
                    </p>
                    
                    {status !== "error" && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                                style={{ width: `${status === 'generating' ? 80 : status === 'downloading' ? 95 : progress}%` }}
                            ></div>
                        </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    {status === "error" && (
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                            onClick={() => setIsOpen(false)}
                        >
                            Close
                        </button>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
