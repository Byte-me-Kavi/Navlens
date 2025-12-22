"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { FeedbackSettings } from "@/features/feedback/components/FeedbackSettings";

export function SettingsTab() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
       <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl shadow-indigo-500/5 p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Feedback Widget</h2>
                <p className="text-sm text-gray-500">Configure how you collect user feedback</p>
            </div>
          </div>
          
          <div className="bg-white/50 rounded-xl p-1 border border-white/50">
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
