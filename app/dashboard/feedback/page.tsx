'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSite } from '@/app/context/SiteContext';
import { secureApi } from '@/lib/secureApi';
import LoadingSpinner from '@/components/LoadingSpinner';
import NoSiteSelected, { NoSitesAvailable } from '@/components/NoSiteSelected';
import {
  FiMessageCircle,
  FiAlertCircle,
  FiThumbsUp,
  FiRefreshCw,
  FiCalendar,
  FiFilter,
  FiExternalLink,
  FiStar,
  FiUser,
  FiGlobe,
  FiSmartphone,
} from 'react-icons/fi';
import { HiBugAnt, HiLightBulb, HiChatBubbleLeftRight } from 'react-icons/hi2';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useAI } from '@/context/AIProvider';
import Link from 'next/link';
import { FeatureLock } from '@/components/subscription/FeatureLock';

interface Feedback {
  id: string;
  session_id: string;
  visitor_id?: string;
  feedback_type: string;
  rating: number | null;
  message: string;
  intent?: string;
  issues?: string[];
  page_path: string;
  page_url?: string;
  device_type: string;
  user_agent?: string;
  survey_type?: string;
  created_at: string;
  metadata?: {
    intent?: string;
    issues?: string[];
    [key: string]: unknown;
  };
}

interface FeedbackStats {
  typeCounts: Record<string, number>;
  avgRating: number | null;
  totalFeedback: number;
}

export default function FeedbackDashboardPage() {
  const { selectedSiteId, sites, sitesLoading, fetchSites } = useSite();
  const { openChat } = useAI();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Handle AI analysis for feedback
  const handleAIAnalysis = () => {
    openChat('feedback', {
      feedbackCount: feedback.length,
      stats,
      filterType,
      dateRange,
      sampleFeedback: feedback.slice(0, 10).map(f => ({
        type: f.feedback_type,
        rating: f.rating,
        message: f.message?.slice(0, 200),
        page: f.page_path,
      })),
    });
  };

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  const fetchFeedback = useCallback(async () => {
    if (!selectedSiteId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { startDate, endDate } = getDateRange();
      const data = await secureApi.feedback.dashboardList({
        siteId: selectedSiteId,
        startDate,
        endDate,
        feedbackType: filterType,
        page,
        limit: 20,
      });
      
      setFeedback((data.feedback as Feedback[]) || []);
      setStats(data.stats as FeedbackStats);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId, filterType, dateRange, page]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <HiBugAnt className="w-5 h-5" />;
      case 'suggestion':
        return <HiLightBulb className="w-5 h-5" />;
      case 'survey_response':
        return <FiStar className="w-5 h-5" />;
      default:
        return <HiChatBubbleLeftRight className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bug':
        return 'Bug Report';
      case 'suggestion':
        return 'Suggestion';
      case 'survey_response':
        return 'Survey';
      default:
        return 'General';
    }
  };

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading sites..." />
      </div>
    );
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <FeatureLock 
      feature="feedback_widget" 
      title="Unlock Feedback Widget" 
      description="Collect bug reports, suggestions, and feedback directly from your users."
    >
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                    <FiMessageCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
                    <p className="text-gray-500">Listen to your users and improve their experience</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button
                onClick={handleAIAnalysis}
                disabled={feedback.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-xl font-medium transition-all disabled:opacity-50 shadow-sm"
              >
                <SparklesIcon className="w-4 h-4" />
                AI Insights
              </button>

              <button
                onClick={fetchFeedback}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 font-medium shadow-sm"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                {['all', 'bug', 'suggestion', 'survey_response', 'general'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
                            filterType === type 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {type === 'all' ? 'All Feedback' : getTypeLabel(type)}
                    </button>
                ))}
            </div>

            <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    dateRange === range
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </button>
                ))}
            </div>
        </div>

        {/* No Sites or No Site Selected */}
        {sites.length === 0 ? (
          <NoSitesAvailable />
        ) : !selectedSiteId ? (
          <NoSiteSelected 
            featureName="feedback"
            description="Bug reports, suggestions, and user survey responses will appear here."
          />
        ) : null}

        {selectedSiteId && (
            <>
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-indigo-100 transition-colors group">
                  <div className="text-sm font-medium text-indigo-600 mb-1">Total Feedback</div>
                  <div className="text-2xl font-bold text-indigo-600 transition-colors">{stats.totalFeedback}</div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-red-100 transition-colors group">
                  <div className="text-sm font-medium text-red-600 mb-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" /> Bug Reports
                  </div>
                  <div className="text-2xl font-bold text-red-600 transition-colors">{stats.typeCounts.bug || 0}</div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-amber-100 transition-colors group">
                   <div className="text-sm font-medium text-amber-600 mb-1 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Suggestions
                  </div>
                  <div className="text-2xl font-bold text-amber-600 transition-colors">{stats.typeCounts.suggestion || 0}</div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-green-100 transition-colors group">
                  <div className="text-sm font-medium text-green-600 mb-1">Avg Rating</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-green-600 transition-colors">
                      {stats.avgRating !== null ? stats.avgRating.toFixed(1) : '-'}
                    </div>
                    {stats.avgRating !== null && <FiStar className="w-4 h-4 text-green-600 fill-green-600" />}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
                <LoadingSpinner message="Loading feedback..." fullScreen={false} />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-100">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to load feedback</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={fetchFeedback} className="text-sm font-medium text-red-700 hover:text-red-800 underline">Try Again</button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && feedback.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-dashed border-gray-300">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiMessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Feedback Yet</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
                  Get valuable insights from your users. Ensure the feedback widget is installed on your site.
                </p>
                <a href="/docs/installation" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors">
                    Setup Instructions
                </a>
              </div>
            )}

            {/* Content List */}
            {!loading && !error && feedback.length > 0 && (
              <div className="space-y-4">
                    {feedback.map((item) => {
                      // Extract intent and issues
                      const intent = item.intent || item.metadata?.intent;
                      const issues = item.issues || item.metadata?.issues || [];
                      
                      return (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all group"
                        >
                          <div className="flex flex-col md:flex-row gap-4 md:items-start">
                            {/* Icon Column */}
                            <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    item.feedback_type === 'bug' ? 'bg-red-50 text-red-600' :
                                    item.feedback_type === 'suggestion' ? 'bg-amber-50 text-amber-600' :
                                    item.feedback_type === 'survey_response' ? 'bg-purple-50 text-purple-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                    {getTypeIcon(item.feedback_type)}
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">
                                        {getTypeLabel(item.feedback_type)}
                                    </span>
                                    
                                    <span className="text-gray-300 text-xs">•</span>
                                    
                                    <span className="text-sm text-gray-500">
                                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>

                                    {item.rating !== null && (
                                        <span className={`ml-auto md:ml-2 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                            item.rating >= 4 ? 'bg-green-50 text-green-700 border-green-100' :
                                            item.rating <= 2 ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-gray-50 text-gray-700 border-gray-100'
                                        }`}>
                                            {item.rating} / 5
                                        </span>
                                    )}
                                </div>
                                
                                <p className="text-gray-800 text-base leading-relaxed mb-3">
                                    "{item.message}"
                                </p>
                                
                                {/* Tags container */}
                                {(intent || issues.length > 0 || item.survey_type) && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {intent && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-md border border-indigo-100">
                                                <SparklesIcon className="w-3 h-3" /> {intent}
                                            </span>
                                        )}
                                        {item.survey_type && (
                                            <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-100 uppercase tracking-wider">
                                                {item.survey_type.replace('_', ' ')}
                                            </span>
                                        )}
                                        {issues.map((issue, idx) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-md border border-red-100">
                                                {issue.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Meta Footer */}
                                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-50 mt-2">
                                    <div className="flex items-center gap-1.5" title="Page URL">
                                        <FiGlobe className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[150px] md:max-w-[300px] font-mono">{item.page_path}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5" title="Device">
                                        <FiSmartphone className="w-3.5 h-3.5" />
                                        <span className="capitalize">{item.device_type}</span>
                                    </div>
                                    {item.visitor_id && (
                                        <div className="flex items-center gap-1.5 ml-auto" title="Visitor ID">
                                            <FiUser className="w-3.5 h-3.5" />
                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{item.visitor_id.slice(0, 8)}</span>
                                        </div>
                                    )}
                                    <Link
                                        href={`/dashboard/session-replayer?sessionId=${item.session_id}`}
                                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors ml-2"
                                    >
                                        <FiExternalLink className="w-3.5 h-3.5" />
                                        Replay Session
                                    </Link>
                                </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
            </>
        )}
      </div>
    </div>
    </FeatureLock>
  );
}
