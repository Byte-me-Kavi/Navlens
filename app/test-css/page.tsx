"use client";

import { useEffect } from "react";

export default function TestPage() {
  useEffect(() => {
    // Load the local tracker for testing
    const script = document.createElement("script");
    script.src = "/tracker.js";
    script.setAttribute("data-site-id", "52db6643-bda5-4b02-9a38-658b14f7f29a");
    script.setAttribute("data-api-key", "69e4dce7-5f3b-44c9-a0e1-aea13097e8a1");
    script.setAttribute("data-api-host", "http://localhost:3000");
    document.head.appendChild(script);

    return () => {
      // Cleanup
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          CSS Extraction Test
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Test Elements
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-red-100 text-red-800 rounded border-2 border-red-200">
              <strong>Red Box:</strong> This should have red background and text
            </div>

            <div className="p-4 bg-blue-100 text-blue-800 rounded border-2 border-blue-200">
              <strong>Blue Box:</strong> This should have blue background and
              text
            </div>

            <button className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
              Green Button
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-yellow-100 text-yellow-800 rounded border-2 border-yellow-200">
                Yellow Card
              </div>
              <div className="p-4 bg-purple-100 text-purple-800 rounded border-2 border-purple-200">
                Purple Card
              </div>
              <div className="p-4 bg-pink-100 text-pink-800 rounded border-2 border-pink-200">
                Pink Card
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Open browser developer tools (F12)</li>
            <li>
              Check the console for "Navlens: Extracted X CSS sources" messages
            </li>
            <li>
              Navigate to the dashboard to see if the snapshot includes proper
              styling
            </li>
            <li>The iframe should display these colored elements correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
