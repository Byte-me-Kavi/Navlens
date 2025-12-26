"use client";

import React, { useEffect, useState } from "react";
import { secureApi } from "@/lib/secureApi";
import {
  FiStar,
  FiGlobe,
  FiSmartphone,
} from 'react-icons/fi';
import { HiBugAnt, HiLightBulb, HiChatBubbleLeftRight } from 'react-icons/hi2';

interface Feedback {
  id: string;
  feedback_type: string;
  rating: number | null;
  message: string;
  intent?: string;
  issues?: string[];
  page_path: string;
  device_type: string;
  created_at: string;
  metadata?: {
    intent?: string;
    issues?: string[];
  };
}

interface FeedbackStats {
  typeCounts: Record<string, number>;
  avgRating: number | null;
  totalFeedback: number;
}

const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <HiBugAnt className="w-4 h-4" />;
      case 'suggestion': return <HiLightBulb className="w-4 h-4" />;
      case 'survey_response': return <FiStar className="w-4 h-4" />;
      default: return <HiChatBubbleLeftRight className="w-4 h-4" />;
    }
};

const getTypeLabel = (type: string) => {
    switch (type) {
        case 'bug': return 'Bug Report';
        case 'suggestion': return 'Suggestion';
        case 'survey_response': return 'Survey';
        default: return 'General';
    }
};

export default function ReportFeedbackWrapper({ siteId, days, shareToken }: { siteId: string, days: number, shareToken?: string }) {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!siteId) return;
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const data = await secureApi.feedback.dashboardList({
          siteId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          feedbackType: 'all',
          page: 1,
          limit: 10, // Top 10 for report
        }, shareToken);
        
        setFeedback((data.feedback as Feedback[]) || []);
        setStats(data.stats as FeedbackStats);
      } catch (err) {
        console.error("Failed to load feedback", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, days, shareToken]);

  if (loading) return <div className="text-gray-500 text-center py-4">Loading Feedback...</div>;
  if (!stats || feedback.length === 0) return <div className="text-gray-500 italic">No feedback recorded in this period.</div>;

  return (
    <div className="space-y-6 break-inside-avoid">
       {/* Stats */}
       <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.totalFeedback}</div>
                <div className="text-xs text-gray-500">Total Items</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
                 <div className="text-2xl font-bold text-red-600">{stats.typeCounts.bug || 0}</div>
                 <div className="text-xs text-gray-500">Bugs</div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
                 <div className="text-2xl font-bold text-amber-600">{stats.typeCounts.suggestion || 0}</div>
                 <div className="text-xs text-gray-500">Suggestions</div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-100 text-center">
                 <div className="text-2xl font-bold text-green-600">{stats.avgRating?.toFixed(1) || '-'}</div>
                 <div className="text-xs text-gray-500">Avg Rating</div>
            </div>
       </div>

       {/* List */}
       <div className="space-y-3">
           {feedback.slice(0, 5).map((item) => (
               <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100">
                   <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                             item.feedback_type === 'bug' ? 'bg-red-50 text-red-600' :
                             item.feedback_type === 'suggestion' ? 'bg-amber-50 text-amber-600' :
                             'bg-blue-50 text-blue-600'
                        }`}>
                            {getTypeIcon(item.feedback_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-gray-900">{getTypeLabel(item.feedback_type)}</span>
                                <span className="text-xs text-gray-400">
                                     {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-gray-700 text-sm mb-2 line-clamp-2">&quot;{item.message}&quot;</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><FiGlobe className="w-3 h-3"/> {item.page_path}</span>
                                <span className="flex items-center gap-1"><FiSmartphone className="w-3 h-3"/> {item.device_type}</span>
                                {item.rating && (
                                    <span className="font-bold text-green-600 flex items-center gap-1"><FiStar className="w-3 h-3 fill-current"/> {item.rating}/5</span>
                                )}
                            </div>
                        </div>
                   </div>
               </div>
           ))}
       </div>
    </div>
  );
}
