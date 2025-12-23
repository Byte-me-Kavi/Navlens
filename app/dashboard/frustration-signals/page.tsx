'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSite } from '@/app/context/SiteContext';
import { FrustrationSignalsPanel } from '@/features/frustration-signals/components/FrustrationSignalsPanel';
import { AttentionZonesChart } from '@/features/frustration-signals/components/AttentionZonesChart';
import { CursorPathsPanel } from '@/features/frustration-signals/components/CursorPathsPanel';
import { frustrationSignalsApi } from '@/features/frustration-signals/services/frustrationSignalsApi';
import { 
  HoverHeatmapData, 
  CursorPathsData, 
  FrustrationSignalsData 
} from '@/features/frustration-signals/types/frustrationSignals.types';
import LoadingSpinner from '@/components/LoadingSpinner';
import NoSiteSelected, { NoSitesAvailable } from '@/components/NoSiteSelected';
import { FeatureLock } from '@/components/subscription/FeatureLock';
import { useSubscription } from '@/app/context/SubscriptionContext';
import { FiAlertTriangle, FiRefreshCw, FiChevronDown } from 'react-icons/fi';
import { apiClient } from '@/shared/services/api/client';

export default function FrustrationSignalsPage() {
  const { selectedSiteId, sites, sitesLoading, fetchSites } = useSite();
  const { hasFeature } = useSubscription();
  const [pagePath, setPagePath] = useState('/');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  
  // Page paths for dropdown
  const [availablePagePaths, setAvailablePagePaths] = useState<string[]>([]);
  const [loadingPagePaths, setLoadingPagePaths] = useState(false);

  // Unified data states
  const [frustrationData, setFrustrationData] = useState<FrustrationSignalsData | null>(null);
  const [hoverData, setHoverData] = useState<HoverHeatmapData | null>(null);
  const [cursorData, setCursorData] = useState<CursorPathsData | null>(null);
  
  // Single loading state for all data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range
  const getDateRange = useCallback(() => {
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
  }, [dateRange]);

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Fetch available page paths when site changes
  useEffect(() => {
    const fetchPagePaths = async () => {
      if (!selectedSiteId) {
        setAvailablePagePaths([]);
        return;
      }
      
      setLoadingPagePaths(true);
      try {
        const response = await apiClient.post<{ pagePaths: string[] }>('/get-pages-list', {
          siteId: selectedSiteId,
        });
        setAvailablePagePaths(response.pagePaths || []);
        // If current page path is not in the list, reset to first available or '/'
        if (response.pagePaths && response.pagePaths.length > 0 && !response.pagePaths.includes(pagePath)) {
          setPagePath(response.pagePaths[0]);
        }
      } catch (err) {
        console.error('Error fetching page paths:', err);
        setAvailablePagePaths([]);
      } finally {
        setLoadingPagePaths(false);
      }
    };
    
    fetchPagePaths();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  // Fetch ALL data together when site/page/date changes
  const fetchAllData = useCallback(async () => {
    if (!selectedSiteId) {
      setIsLoading(false);
      return;
    }

    // Check feature access
    if (!hasFeature('frustration_signals')) {
      setIsLoading(false);
      return;
    }

    const { startDate, endDate } = getDateRange();

    setIsLoading(true);
    setError(null);

    try {
      // Fetch ALL 3 data sources in parallel
      const [frustrationResult, hoverResult, cursorResult] = await Promise.all([
        frustrationSignalsApi.getFrustrationSignals({
          siteId: selectedSiteId,
          pagePath,
          startDate,
          endDate,
        }).catch(err => {
          console.error('Frustration signals error:', err);
          return null;
        }),
        frustrationSignalsApi.getHoverHeatmap({
          siteId: selectedSiteId,
          pagePath,
          startDate,
          endDate,
        }).catch(err => {
          console.error('Hover heatmap error:', err);
          return null;
        }),
        frustrationSignalsApi.getCursorPaths({
          siteId: selectedSiteId,
          pagePath,
          startDate,
          endDate,
        }).catch(err => {
          console.error('Cursor paths error:', err);
          return null;
        }),
      ]);

      setFrustrationData(frustrationResult);
      setHoverData(hoverResult);
      setCursorData(cursorResult);
    } catch (err) {
      console.error('Error fetching frustration data:', err);
      setError('Failed to load frustration signals data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSiteId, pagePath, getDateRange, hasFeature]);

  useEffect(() => {
    if (selectedSiteId) {
      fetchAllData();
    }
  }, [fetchAllData, selectedSiteId]);

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Loading sites..." />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="p-6">
        <NoSitesAvailable />
      </div>
    );
  }

  const { startDate: _startDate, endDate: _endDate } = getDateRange();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <FeatureLock 
        feature="frustration_signals"
        title="Unlock Frustration Signals"
        description="Identify rage clicks and dead clicks to improve user experience."
      >
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 rounded-xl">
                <FiAlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Frustration Signals</h1>
            </div>
            <p className="text-gray-600 text-base">
              Detect and analyze user frustration patterns
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchAllData}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Site Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Site
              </label>
              {selectedSite ? (
                <div className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium text-sm inline-block">
                  {selectedSite.site_name || selectedSite.domain}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Select a site first</span>
              )}
            </div>

            {/* Page Path Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Page Path
              </label>
              <div className="relative">
                <select
                  value={pagePath}
                  onChange={(e) => setPagePath(e.target.value)}
                  disabled={loadingPagePaths}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm appearance-none bg-white pr-10 disabled:opacity-50"
                >
                  {availablePagePaths.length === 0 && (
                    <option value="/">/</option>
                  )}
                  {availablePagePaths.map((path) => (
                    <option key={path} value={path}>
                      {path}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              {loadingPagePaths && (
                <p className="text-xs text-gray-400 mt-1">Loading pages...</p>
              )}
              {!loadingPagePaths && availablePagePaths.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  {availablePagePaths.length} page{availablePagePaths.length !== 1 ? 's' : ''} tracked
                </p>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date Range
              </label>
              <div className="flex gap-2">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      dateRange === range
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* No Site Selected */}
        {!selectedSiteId && (
          <NoSiteSelected 
            featureName="frustration signals"
            description="Rage clicks, dead clicks, U-turns, and other user frustration patterns will appear here."
          />
        )}

        {/* Loading State - Show until all data is ready */}
        {selectedSiteId && isLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600 font-medium">Loading frustration signals...</p>
              <p className="text-gray-400 text-sm mt-1">Analyzing user behavior data</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {selectedSiteId && !isLoading && error && (
          <div className="bg-white rounded-2xl border border-red-100 p-8 shadow-sm text-center">
            <FiAlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={fetchAllData}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Dashboard Grid - Only shown when data is loaded */}
        {selectedSiteId && !isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Frustration Signals Panel - spans full width */}
            <div className="lg:col-span-2">
              <FrustrationSignalsPanel
                data={frustrationData}
                onRefresh={fetchAllData}
              />
            </div>

            {/* Attention Zones Chart */}
            <AttentionZonesChart
              data={hoverData}
              loading={false}
              error={null}
              onRefresh={fetchAllData}
            />

            {/* Cursor Paths Panel */}
            <CursorPathsPanel
              data={cursorData}
              loading={false}
              error={null}
              onRefresh={fetchAllData}
            />
          </div>
        )}
      </FeatureLock>
    </div>
  );
}
