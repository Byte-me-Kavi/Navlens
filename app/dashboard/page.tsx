"use client";

import {
  ChartBarIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const stats = [
  {
    name: "Total Sites",
    value: "0",
    icon: ChartBarIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    name: "Total Clicks",
    value: "0",
    icon: CursorArrowRaysIcon,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  {
    name: "Active Sessions",
    value: "0",
    icon: EyeIcon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    name: "Heatmaps Generated",
    value: "0",
    icon: SparklesIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
];

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-linear-to-r from-blue-100 to-cyan-50 border border-blue-300 rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          Welcome to Navlens
        </h1>
        <p className="text-blue-700 text-lg">
          Transform your website analytics with intelligent heatmap tracking
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 border border-blue-200 hover:shadow-lg hover:border-blue-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-blue-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Getting Started Section */}
      <div className="bg-white rounded-xl border border-blue-200 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">
          Getting Started
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Add Your First Site
              </h3>
              <p className="text-gray-600 text-sm">
                Navigate to "My Sites" and add your website to start tracking
                user interactions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="shrink-0 w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Install Tracking Script
              </h3>
              <p className="text-gray-600 text-sm">
                Copy and paste the JavaScript snippet into your website's HTML
                to begin collecting data.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                View Your Heatmaps
              </h3>
              <p className="text-gray-600 text-sm">
                Once data starts flowing, visualize user behavior with
                interactive heatmaps and insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-linear-to-br from-blue-600 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-xl font-bold mb-2">Add Your First Site</h3>
          <p className="text-white/90 mb-4">
            Start tracking user behavior in minutes
          </p>
          <button className="bg-white text-blue-900 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md">
            Get Started
          </button>
        </div>

        <div className="bg-white border-2 border-purple-300 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            Documentation
          </h3>
          <p className="text-gray-600 mb-4">
            Learn how to make the most of Navlens
          </p>
          <button className="bg-purple-100 text-purple-700 px-6 py-2 rounded-lg font-semibold hover:bg-purple-200 transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </div>
  );
}
