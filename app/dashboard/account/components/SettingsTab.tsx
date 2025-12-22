"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { FeedbackSettings } from "@/features/feedback/components/FeedbackSettings";

export function SettingsTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-50 rounded-xl">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Feedback Widget</h2>
                <p className="text-sm text-gray-500">Configure how you collect user feedback</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-1 border border-white">
             <FeedbackSettings className="border-0 shadow-none p-0 bg-transparent" />
          </div>
        </div>
        
        {/* Placeholder for future settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm opacity-60">
             <h3 className="font-semibold text-gray-400 mb-2">Team Management</h3>
             <p className="text-sm text-gray-400">Team features coming soon in Pro plan.</p>
        </div>
    </div>
  );
}
