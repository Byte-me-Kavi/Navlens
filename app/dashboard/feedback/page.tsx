'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSite } from '@/app/context/SiteContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  FiMessageCircle,
  FiAlertCircle,
  FiThumbsUp,
  FiRefreshCw,
  FiCalendar,
  FiFilter,
  FiExternalLink,
  FiStar,
} from 'react-icons/fi';
import { HiBugAnt, HiLightBulb, HiChatBubbleLeftRight } from 'react-icons/hi2';

interface Feedback {
  id: string;
  session_id: string;
  feedback_type: string;
  rating: number | null;
  message: string;
  page_path: string;
  device_type: string;
  created_at: string;
}

interface FeedbackStats {
  typeCounts: Record<string, number>;
  avgRating: number | null;
  totalFeedback: number;
}

export default function FeedbackDashboardPage() {
  const { selectedSiteId, sites, sitesLoading, fetchSites } = useSite();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

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
      const response = await fetch('/api/dashboard/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          startDate,
          endDate,
          feedbackType: filterType,
          page,
          limit: 20,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch feedback');
      
      const data = await response.json();
      setFeedback(data.feedback || []);
      setStats(data.stats || null);
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
        return <HiBugAnt className="w-4 h-4 text-red-500" />;
      case 'suggestion':
        return <HiLightBulb className="w-4 h-4 text-yellow-500" />;
      case 'survey_response':
        return <FiStar className="w-4 h-4 text-purple-500" />;
      default:
        return <HiChatBubbleLeftRight className="w-4 h-4 text-blue-500" />;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <FiMessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
              <p className="text-sm text-gray-600">
                Voice of Customer - Feedback & Survey Responses
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Filter by Type */}
              <div className="flex items-center gap-2">
                <FiFilter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="bug">Bug Reports</option>
                  <option value="suggestion">Suggestions</option>
                  <option value="general">General</option>
                  <option value="survey_response">Survey Responses</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-gray-500" />
                <div className="flex gap-1">
                  {(['7d', '30d', '90d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        dateRange === range
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={fetchFeedback}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* No Site Selected */}
        {!selectedSiteId && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <FiMessageCircle className="w-12 h-12 mx-auto text-blue-300 mb-4" />
            <p className="text-gray-600 text-lg font-medium">
              Select a site from the sidebar to view feedback
            </p>
          </div>
        )}

        {selectedSiteId && (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalFeedback}</div>
                  <div className="text-sm text-gray-500">Total Feedback</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                  <div className="text-3xl font-bold text-red-600">{stats.typeCounts.bug || 0}</div>
                  <div className="text-sm text-gray-500">Bug Reports</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                  <div className="text-3xl font-bold text-yellow-600">{stats.typeCounts.suggestion || 0}</div>
                  <div className="text-sm text-gray-500">Suggestions</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-bold text-purple-600">
                      {stats.avgRating !== null ? stats.avgRating.toFixed(1) : '-'}
                    </div>
                    {stats.avgRating !== null && <FiStar className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div className="text-sm text-gray-500">Avg Rating</div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-500">Loading feedback...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 rounded-xl p-6 text-center border border-red-100">
                <FiAlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Feedback List */}
            {!loading && !error && feedback.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
                <FiThumbsUp className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Feedback Yet</h3>
                <p className="text-gray-500 text-sm">
                  User feedback will appear here once collected via the feedback widget.
                </p>
              </div>
            )}

            {!loading && !error && feedback.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {feedback.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(item.feedback_type)}
                            <span className="text-sm font-medium text-gray-700">
                              {getTypeLabel(item.feedback_type)}
                            </span>
                            {item.rating !== null && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                Score: {item.rating}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm">{item.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>📍 {item.page_path}</span>
                            <span>📱 {item.device_type}</span>
                            <a
                              href={`/dashboard/sessions/${item.session_id}`}
                              className="flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <FiExternalLink className="w-3 h-3" />
                              View Session
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-100 flex justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-50"
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
  );
}
