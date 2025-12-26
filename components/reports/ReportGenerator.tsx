"use client";

import { useSite } from "@/app/context/SiteContext";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

interface ReportGeneratorProps {
  siteId: string;
}

export function ReportGenerator({ siteId }: ReportGeneratorProps) {
  const { selectedSiteId: _selectedSiteId } = useSite();

  const handleGenerateReport = () => {
    // Open the report preview in a new tab
    if (siteId) {
      window.open(`/report-preview/${siteId}`, '_blank');
    }
  };

  if (!siteId) return null;

  return (
    <button
      onClick={handleGenerateReport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all shadow-sm hover:shadow"
      title="Generate PDF Report"
    >
      <DocumentTextIcon className="w-5 h-5 text-gray-500" />
      <span>Report</span>
    </button>
  );
}
