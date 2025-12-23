'use client';

/**
 * Form Analytics Dashboard Page
 * Shows form drop-off rates, time-to-fill, and refill metrics
 */

import { useState, useMemo } from 'react';
import { useSite } from '@/app/context/SiteContext';
import { useFormList, useFormMetrics, formAnalyticsApi } from '@/features/form-analytics';
import LoadingSpinner from '@/components/LoadingSpinner';
import NoSiteSelected, { NoSitesAvailable } from '@/components/NoSiteSelected';
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
  FiChevronDown,
  FiInfo,
} from 'react-icons/fi';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { useAI } from '@/context/AIProvider';
import { FeatureLock } from '@/components/subscription/FeatureLock';
import { useSubscription } from '@/app/context/SubscriptionContext';
import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Date range options
const DATE_RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

// Funnel colors - More distinct colors for better visibility
const FUNNEL_COLORS = [
  '#4f46e5', // Indigo 600
  '#7c3aed', // Violet 600
  '#db2777', // Pink 600
  '#ea580c', // Orange 600
  '#059669', // Emerald 600
  '#2563eb', // Blue 600
  '#d97706', // Amber 600
  '#dc2626', // Red 600
];

// Metric explanations
const METRIC_EXPLANATIONS = {
  avgTime: 'Average time users spend filling out this field. Longer times may indicate confusion or complexity.',
  dropOff: 'Percentage of users who left this field without completing the form. Negative values indicate more users arrived at this field than the previous one.',
  refillRate: 'Percentage of times users deleted and re-entered content in this field. High rates suggest unclear requirements or validation issues.',
  interactions: 'Total number of times users focused on (clicked into) this field.',
};

// Custom tooltip for funnel - defined outside component to avoid recreation during render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomFunnelTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl min-w-[200px]">
        <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></span>
          {data.name}
        </p>
        <div className="space-y-1.5 text-sm">
          <p className="text-gray-600">
            Interactions: <span className="font-semibold text-gray-900">{data.value}</span>
            <span className="text-gray-400"> ({data.retentionPercent}% retained)</span>
          </p>
          <p className="text-gray-600">
            Avg Time: <span className="font-semibold text-indigo-600">{data.avgTime}</span>
          </p>
          <p className="text-gray-600">
            Drop-off: <span className="font-semibold" style={{ color: formAnalyticsApi.getDropoffColor(data.dropOff) }}>{data.dropOff}%</span>
          </p>
          <p className="text-gray-600">
            Refill Rate: <span className="font-semibold" style={{ color: formAnalyticsApi.getRefillColor(data.refillRate) }}>{data.refillRate}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function FormAnalyticsPage() {
  const { selectedSiteId: siteId, sites, sitesLoading } = useSite();
  const { openChat } = useAI();
  const { hasFeature } = useSubscription();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  // Handle AI analysis for forms
  const handleAIAnalysis = () => {
    openChat('form', {
      formId: selectedFormId,
      days,
      overallDropoff: 0, // Will be updated after data is loaded
    });
  };

  const isFeatureEnabled = hasFeature('form_analytics');

  // Fetch forms list
  const { forms, isLoading: formsLoading, refresh: refreshForms } = useFormList({
    siteId: siteId || '',
    days,
    enabled: !!siteId && isFeatureEnabled,
  });

  // Compute effective form ID (selected or first available)
  const effectiveFormId = selectedFormId || (forms.length > 0 ? forms[0].form_id : null);

  // Fetch selected form metrics
  const { 
    fields, 
    overallDropoff, 
    worstRefillField, 
    avgTimeMs,
    isLoading: metricsLoading 
  } = useFormMetrics({
    siteId: siteId || '',
    formId: effectiveFormId,
    days,
    enabled: !!siteId && !!effectiveFormId && isFeatureEnabled,
  });

  // Get selected form details
  const selectedForm = useMemo(() => {
    return forms.find(f => f.form_id === effectiveFormId);
  }, [forms, effectiveFormId]);

  // Prepare funnel data for Recharts
  const funnelData = useMemo(() => {
    if (!fields || fields.length === 0) return [];
    
    const filteredFields = fields.filter(field => field.field_name || field.field_id);
    const firstFieldFocus = filteredFields[0]?.focus_count || 1;
    
    return filteredFields.map((field, index) => {
      const displayName = (field.field_name || field.field_id || '').includes('[object')
        ? `Field ${index + 1}`
        : (field.field_name || field.field_id || 'Unknown');
      
      // Calculate retention percentage from first field
      const retentionPercent = Math.round((field.focus_count / firstFieldFocus) * 100);
      
      return {
        name: displayName,
        value: field.focus_count,
        retentionPercent,
        dropOff: field.drop_off_rate,
        avgTime: formAnalyticsApi.formatTime(field.avg_time_ms),
        refillRate: field.refill_rate,
        fieldType: field.field_type,
      };
    });
  }, [fields]);

  // No sites or no site selected
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

  if (!siteId) {
    return (
      <div className="p-6">
        <NoSiteSelected 
          featureName="form analytics"
          description="Field-level drop-off, time-to-fill, and refill metrics will appear here."
        />
      </div>
    );
  }

  if (formsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner message="Loading form analytics..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
    <FeatureLock 
      feature="form_analytics" 
      title="Unlock Form Analytics" 
      description="Optimize your conversion rates by tracking field-level drop-offs and time-to-fill metrics."
    >
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <FiFileText className="w-6 h-6 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Form Analytics</h1>
             </div>
            <p className="text-gray-600 text-base">
              Analyze field-level form performance and drop-off
            </p>
          </div>
          <div className="flex gap-3">
            {/* AI Analysis Button */}
            <button
              onClick={handleAIAnalysis}
              disabled={forms.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50 hover:shadow-md font-medium"
            >
              <SparklesIcon className="w-4 h-4" />
              AI Insights
            </button>

            <button
              onClick={refreshForms}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {forms.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-100 p-16 text-center shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-indigo-50 rounded-full ring-8 ring-indigo-50/50">
                <FiFileText className="w-12 h-12 text-indigo-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Forms Tracked Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Forms will appear here once users interact with them on your tracked pages.
              Make sure the Navlens tracker is installed on pages with forms.
            </p>
          </div>
        ) : (
          <>
            {/* Form selector and date range */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Form
                </label>
                <div className="relative">
                  <select
                    value={effectiveFormId || ''}
                    onChange={(e) => setSelectedFormId(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    {forms.map(form => {
                      // Clean up form_id if it contains [object ...]
                      const displayName = form.form_id.includes('[object') 
                        ? `Form ${forms.indexOf(form) + 1}`
                        : form.form_id;
                      return (
                        <option key={form.form_id} value={form.form_id}>
                          {displayName} ({form.total_submissions} submissions)
                        </option>
                      );
                    })}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
  
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date Range
                </label>
                <div className="relative">
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-w-[160px]"
                  >
                    {DATE_RANGES.map(range => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
  
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <FiCheckCircle className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Submissions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedForm?.total_submissions || 0}
                    </p>
                  </div>
                </div>
              </div>
  
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <FiClock className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Time</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formAnalyticsApi.formatTime(avgTimeMs)}
                    </p>
                  </div>
                </div>
              </div>
  
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <FiAlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Drop-off Rate</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: formAnalyticsApi.getDropoffColor(overallDropoff) }}>
                      {Number.isFinite(overallDropoff) && overallDropoff >= 0 ? `${overallDropoff}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>
  
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <FiRefreshCw className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-600">Top Refill Field</p>
                    <p className="text-lg font-bold text-gray-900 truncate mt-1">
                      {worstRefillField?.field_name || 'N/A'}
                    </p>
                    {worstRefillField && (
                      <p className="text-xs font-medium text-red-600 mt-0.5">
                        {worstRefillField.refill_rate}% refill rate
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
  
            {/* Field Drop-off Funnel - Recharts Version */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                  Field Drop-off Funnel
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FiInfo className="w-4 h-4" />
                  <span>Hover for details</span>
                </div>
              </div>
              
              {metricsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <LoadingSpinner message="Loading field metrics..." />
                </div>
              ) : funnelData.length === 0 ? (
                <p className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No field data available for this form
                </p>
              ) : (
                <div className="h-[350px] w-full bg-gray-50/30 rounded-2xl border border-gray-100/50 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsFunnelChart>
                      <Tooltip content={<CustomFunnelTooltip />} cursor={{ fill: 'transparent' }} />
                      <Funnel
                        dataKey="value"
                        data={funnelData}
                        isAnimationActive
                        stroke="#ffffff"
                        strokeWidth={3}
                      >
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                        ))}
                        <LabelList
                          position="right"
                          fill="#4b5563"
                          stroke="none"
                          dataKey="name"
                          className="font-medium text-sm"
                        />
                        <LabelList
                          position="center"
                          fill="#ffffff"
                          stroke="none"
                          dataKey="retentionPercent"
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(val: any) => `${val}%`}
                          className="font-bold text-sm drop-shadow-sm"
                        />
                      </Funnel>
                    </RechartsFunnelChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
  
            {/* Field Metrics Table with Explanations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                      Field Details
                  </h2>
                </div>
                {/* Metric Explanations */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-gray-100">
                    <FiClock className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Avg Time</p>
                      <p className="text-xs text-gray-500 mt-0.5">{METRIC_EXPLANATIONS.avgTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-gray-100">
                    <FiAlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Drop-off</p>
                      <p className="text-xs text-gray-500 mt-0.5">{METRIC_EXPLANATIONS.dropOff}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-gray-100">
                    <FiRefreshCw className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Refill Rate</p>
                      <p className="text-xs text-gray-500 mt-0.5">{METRIC_EXPLANATIONS.refillRate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-gray-100">
                    <FiCheckCircle className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Interactions</p>
                      <p className="text-xs text-gray-500 mt-0.5">{METRIC_EXPLANATIONS.interactions}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {metricsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <LoadingSpinner message="Loading..." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="px-6 py-4 font-semibold">Field</th>
                        <th className="px-6 py-4 font-semibold">Type</th>
                        <th className="px-6 py-4 font-semibold text-right">
                          <span className="inline-flex items-center gap-1">
                            Avg Time
                            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold text-right">
                          <span className="inline-flex items-center gap-1">
                            Drop-off
                            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold text-right">
                          <span className="inline-flex items-center gap-1">
                            Refill Rate
                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold text-right">Interactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {fields
                        .filter(field => field.field_name || field.field_id) // Filter out empty fields
                        .map((field) => {
                          // Clean up field name
                          const displayName = (field.field_name || field.field_id || '').includes('[object')
                            ? `Field ${fields.indexOf(field) + 1}`
                            : (field.field_name || field.field_id || 'Unknown Field');
                          
                          return (
                            <tr key={field.field_id} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">
                                  {displayName}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
                                  {field.field_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-700 font-medium">
                                {formAnalyticsApi.formatTime(field.avg_time_ms)}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span 
                                  className="font-bold"
                                  style={{ color: formAnalyticsApi.getDropoffColor(field.drop_off_rate) }}
                                >
                                  {Number.isFinite(field.drop_off_rate) ? `${field.drop_off_rate}%` : '0%'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span 
                                  className="font-medium"
                                  style={{ color: formAnalyticsApi.getRefillColor(field.refill_rate) }}
                                >
                                  {Number.isFinite(field.refill_rate) ? `${field.refill_rate}%` : '0%'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-600">
                                {field.focus_count}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
    </FeatureLock>
    </div>
  );
}

