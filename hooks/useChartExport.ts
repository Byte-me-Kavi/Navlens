import { useState, useCallback } from 'react';

import toast from 'react-hot-toast';

interface UseChartExportResult {
    exportToPng: (element: HTMLElement | null, fileName: string) => Promise<void>;
    isExporting: boolean;
}

export const useChartExport = (): UseChartExportResult => {
    const [isExporting, setIsExporting] = useState(false);

    const exportToPng = useCallback(async (element: HTMLElement | null, fileName: string) => {
        if (!element) {
            toast.error('Chart element not found');
            return;
        }

        try {
            setIsExporting(true);
            const toastId = toast.loading('Generating image...');

            // Delay to ensure rendering and font loading
            await new Promise(resolve => setTimeout(resolve, 500));

            const domtoimage = (await import('dom-to-image-more')).default;

            const dataUrl = await domtoimage.toPng(element, {
                bgcolor: '#ffffff',
                style: {
                    transform: 'scale(2)',
                    transformOrigin: 'top left',
                },
                width: element.offsetWidth * 2,
                height: element.offsetHeight * 2,
                quality: 1.0,
                cacheBust: true,
                filter: (node: Node) => {
                    // Exclude elements with 'no-export' class
                    if (node instanceof HTMLElement && node.classList.contains('no-export')) {
                        return false;
                    }
                    return true;
                }
            });

            const link = document.createElement('a');
            link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Chart exported successfully!', { id: toastId });
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export chart', { id: 'export-error' });
        } finally {
            setIsExporting(false);
        }
    }, []);

    return { exportToPng, isExporting };
};
