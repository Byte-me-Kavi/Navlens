'use client';

import React from 'react';
import { FeedbackSettings } from '@/features/feedback/components/FeedbackSettings';
import { FiSettings } from 'react-icons/fi';

export default function FeedbackSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <FiSettings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Feedback Settings</h1>
              <p className="text-sm text-gray-600">
                Configure the feedback widget for your sites
              </p>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <FeedbackSettings />
      </div>
    </div>
  );
}
