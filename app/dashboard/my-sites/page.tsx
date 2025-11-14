"use client";

import {
  PlusIcon,
  GlobeAltIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

export default function MySitesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">My Sites</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your tracked websites
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          <PlusIcon className="w-5 h-5" />
          <span className="font-semibold">Add New Site</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-xl border-2 border-dashed border-blue-300 p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <GlobeAltIcon className="w-16 h-16 text-blue-600" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-blue-900 mb-2">No Sites Yet</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Add your first website to start collecting heatmap data and analyzing
          user behavior.
        </p>
        <button className="inline-flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition-colors shadow-md">
          <PlusIcon className="w-5 h-5" />
          <span className="font-semibold">Add Your First Site</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-linear-to-r from-blue-50 to-cyan-50 border border-blue-300 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <CodeBracketIcon className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-blue-900 mb-2">How to Add a Site</h4>
            <ol className="text-sm text-gray-700 space-y-2">
              <li>1. Click "Add New Site" and enter your website URL</li>
              <li>2. Copy the generated tracking script</li>
              <li>
                3. Paste it into your website's HTML, just before the closing
                &lt;/body&gt; tag
              </li>
              <li>4. Start collecting data and viewing heatmaps!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
