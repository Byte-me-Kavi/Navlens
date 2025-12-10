'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSite } from '@/app/context/SiteContext';
import { FrustrationSignalsPanel } from '@/features/frustration-signals/components/FrustrationSignalsPanel';
import { AttentionZonesChart } from '@/features/frustration-signals/components/AttentionZonesChart';
import { CursorPathsPanel } from '@/features/frustration-signals/components/CursorPathsPanel';
import { frustrationSignalsApi } from '@/features/frustration-signals/services/frustrationSignalsApi';
import { HoverHeatmapData, CursorPathsData } from '@/features/frustration-signals/types/frustrationSignals.types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FiAlertTriangle, FiRefreshCw, FiCalendar, FiGlobe, FiLayers } from 'react-icons/fi';

export default function FrustrationSignalsPage() {
  const { selectedSiteId, sites, sitesLoading, fetchSites } = useSite();
  const [pagePath, setPagePath] = useState('/');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  // Data states
  const [hoverData, setHoverData] = useState<HoverHeatmapData | null>(null);
  const [cursorData, setCursorData] = useState<CursorPathsData | null>(null);
  const [hoverLoading, setHoverLoading] = useState(false);
  const [cursorLoading, setCursorLoading] = useState(false);
  const [hoverError, setHoverError] = useState<Error | null>(null);
  const [cursorError, setCursorError] = useState<Error | null>(null);

  // Calculate date range
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
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Fetch additional data when site/page/date changes
  const fetchData = useCallback(async () => {
    if (!selectedSiteId) return;

    const { startDate, endDate } = getDateRange();

    // Fetch hover heatmap data
    setHoverLoading(true);
    setHoverError(null);
    try {
      const data = await frustrationSignalsApi.getHoverHeatmap({
        siteId: selectedSiteId,
        pagePath,
        startDate,
        endDate,
      });
      setHoverData(data);
    } catch (err) {
      setHoverError(err instanceof Error ? err : new Error('Failed to fetch hover data'));
    } finally {
      setHoverLoading(false);
    }

    // Fetch cursor paths data
    setCursorLoading(true);
    setCursorError(null);
    try {
      const data = await frustrationSignalsApi.getCursorPaths({
        siteId: selectedSiteId,
        pagePath,
        startDate,
        endDate,
      });
      setCursorData(data);
    } catch (err) {
      setCursorError(err instanceof Error ? err : new Error('Failed to fetch cursor data'));
    } finally {
      setCursorLoading(false);
    }
  }, [selectedSiteId, pagePath, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner message="Loading sites..." />
      </div>
    );
  }

  const { startDate, endDate } = getDateRange();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 px-4 py-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
              <FiAlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Frustration Signals</h1>
              <p className="text-sm text-gray-600">
                Detect and analyze user frustration patterns
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Site Selector */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiGlobe className="w-4 h-4" />
                Site
              </label>
              <div className="text-sm">
                {selectedSite ? (
                  <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg inline-block">
                    {selectedSite.site_name || selectedSite.domain}
                  </span>
                ) : (
                  <span className="text-gray-400">Select a site first</span>
                )}
              </div>
            </div>

            {/* Page Path */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiLayers className="w-4 h-4" />
                Page Path
              </label>
              <input
                type="text"
                value={pagePath}
                onChange={(e) => setPagePath(e.target.value)}
                placeholder="/"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="w-4 h-4" />
                Date Range
              </label>
              <div className="flex gap-2">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end mt-4">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh All
            </button>
          </div>
        </div>

        {/* No Site Selected */}
        {!selectedSiteId && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
            <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
              <FiGlobe className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600 text-lg font-medium">
              Please select a site from the sidebar to view frustration signals
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        {selectedSiteId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Frustration Signals Panel */}
            <FrustrationSignalsPanel
              siteId={selectedSiteId}
              pagePath={pagePath}
              startDate={startDate}
              endDate={endDate}
              className="lg:col-span-2"
            />

            {/* Attention Zones Chart */}
            <AttentionZonesChart
              data={hoverData}
              loading={hoverLoading}
              error={hoverError}
              onRefresh={fetchData}
            />

            {/* Cursor Paths Panel */}
            <CursorPathsPanel
              data={cursorData}
              loading={cursorLoading}
              error={cursorError}
              onRefresh={fetchData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
