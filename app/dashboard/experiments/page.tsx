"use client";

import { BeakerIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function ExperimentsPage() {
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Experiments
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          AI-powered insights and conversion optimization experiments
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="p-4 bg-white rounded-full shadow-md">
              <BeakerIcon className="w-12 h-12 text-blue-600" />
            </div>
            <div className="absolute -top-1 -right-1">
              <SparklesIcon className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Experiments Are Coming Soon!
        </h3>
        <p className="text-sm text-gray-700 mb-6 max-w-2xl mx-auto">
          This feature will allow you to run A/B tests and AI-powered
          experiments to automatically optimize your website&rsquo;s conversion
          rates based on heatmap data and user behavior insights.
        </p>

        {/* Feature Preview */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 text-left">
          <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1 text-sm">
              AI Recommendations
            </h4>
            <p className="text-xs text-gray-600">
              Get intelligent suggestions to improve conversion rates
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
              <BeakerIcon className="w-5 h-5 text-slate-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1 text-sm">
              A/B Testing
            </h4>
            <p className="text-xs text-gray-600">
              Test variations and measure performance automatically
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-bold text-gray-900 mb-1 text-sm">
              Auto-Optimization
            </h4>
            <p className="text-xs text-gray-600">
              Let AI continuously improve your site&rsquo;s performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
