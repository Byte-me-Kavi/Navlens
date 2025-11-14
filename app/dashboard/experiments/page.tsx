"use client";

import { BeakerIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function ExperimentsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-3">
          Experiments
          <span className="text-sm bg-purple-100 text-purple-600 px-3 py-1 rounded-full">
            Coming Soon
          </span>
        </h1>
        <p className="text-gray-600 mt-1">
          AI-powered insights and conversion optimization experiments
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-linear-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-12 text-center shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="p-6 bg-white rounded-full shadow-lg">
              <BeakerIcon className="w-16 h-16 text-purple-600" />
            </div>
            <div className="absolute -top-2 -right-2">
              <SparklesIcon className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-blue-900 mb-3">
          Experiments Are Coming Soon!
        </h3>
        <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
          This feature will allow you to run A/B tests and AI-powered
          experiments to automatically optimize your website's conversion rates
          based on heatmap data and user behavior insights.
        </p>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-4 mt-8 text-left">
          <div className="bg-white rounded-lg p-4 border border-blue-300 shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <SparklesIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-bold text-blue-900 mb-1">AI Recommendations</h4>
            <p className="text-sm text-gray-600">
              Get intelligent suggestions to improve conversion rates
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-cyan-300 shadow-sm">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-3">
              <BeakerIcon className="w-6 h-6 text-cyan-600" />
            </div>
            <h4 className="font-bold text-blue-900 mb-1">A/B Testing</h4>
            <p className="text-sm text-gray-600">
              Test variations and measure performance automatically
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-300 shadow-sm">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
              <SparklesIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-bold text-blue-900 mb-1">Auto-Optimization</h4>
            <p className="text-sm text-gray-600">
              Let AI continuously improve your site's performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
