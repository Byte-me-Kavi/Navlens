'use client';

/**
 * Form Analytics Dashboard Page
 * Shows form drop-off rates, time-to-fill, and refill metrics
 */

import { useState, useMemo } from 'react';
import { useSite } from '@/app/context/SiteContext';
import { useFormList, useFormMetrics, formAnalyticsApi } from '@/features/form-analytics';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
  FiChevronDown,
} from 'react-icons/fi';

// Date range options
const DATE_RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export default function FormAnalyticsPage() {
  const { selectedSiteId: siteId } = useSite();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  // Fetch forms list
  const { forms, isLoading: formsLoading, refresh: refreshForms } = useFormList({
    siteId: siteId || '',
    days,
    enabled: !!siteId,
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
    enabled: !!siteId && !!effectiveFormId,
  });

  // Get selected form details
  const selectedForm = useMemo(() => {
    return forms.find(f => f.form_id === effectiveFormId);
  }, [forms, effectiveFormId]);

  if (!siteId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Please select a site to view form analytics</p>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiFileText className="w-7 h-7 text-blue-600" />
            Form Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Analyze field-level form performance and drop-off
          </p>
        </div>
        <button
          onClick={refreshForms}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Forms Tracked Yet</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Forms will appear here once users interact with them on your tracked pages.
            Make sure the Navlens tracker is installed on pages with forms.
          </p>
        </div>
      ) : (
        <>
          {/* Form selector and date range */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Form
              </label>
              <div className="relative">
                <select
                  value={effectiveFormId || ''}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {forms.map(form => (
                    <option key={form.form_id} value={form.form_id}>
                      {form.form_id} ({form.total_submissions} submissions)
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="relative">
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="px-4 py-2 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FiCheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Submissions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedForm?.total_submissions || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FiClock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formAnalyticsApi.formatTime(avgTimeMs)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <FiAlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Drop-off Rate</p>
                  <p className="text-2xl font-bold" style={{ color: formAnalyticsApi.getDropoffColor(overallDropoff) }}>
                    {overallDropoff}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <FiRefreshCw className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Top Refill Field</p>
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {worstRefillField?.field_name || 'N/A'}
                  </p>
                  {worstRefillField && (
                    <p className="text-xs text-red-600">
                      {worstRefillField.refill_rate}% refill rate
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Field Drop-off Funnel */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Field Drop-off Funnel
            </h2>
            
            {metricsLoading ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner message="Loading field metrics..." />
              </div>
            ) : fields.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No field data available for this form
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => {
                  const percentage = fields[0].focus_count > 0 
                    ? Math.round((field.focus_count / fields[0].focus_count) * 100) 
                    : 0;
                  
                  return (
                    <div key={field.field_id} className="flex items-center gap-4">
                      <div className="w-32 text-sm text-gray-700 font-medium truncate" title={field.field_name}>
                        {field.field_name || field.field_id}
                      </div>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-20 text-right">
                        {field.drop_off_rate > 0 && (
                          <span 
                            className="text-sm font-medium"
                            style={{ color: formAnalyticsApi.getDropoffColor(field.drop_off_rate) }}
                          >
                            -{field.drop_off_rate}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Field Metrics Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Field Details
              </h2>
            </div>
            
            {metricsLoading ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner message="Loading..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600">
                      <th className="px-6 py-3 font-medium">Field</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium text-right">Avg Time</th>
                      <th className="px-6 py-3 font-medium text-right">Drop-off</th>
                      <th className="px-6 py-3 font-medium text-right">Refill Rate</th>
                      <th className="px-6 py-3 font-medium text-right">Interactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field) => (
                      <tr key={field.field_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {field.field_name || field.field_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                            {field.field_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">
                          {formAnalyticsApi.formatTime(field.avg_time_ms)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span 
                            className="font-medium"
                            style={{ color: formAnalyticsApi.getDropoffColor(field.drop_off_rate) }}
                          >
                            {field.drop_off_rate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span 
                            className="font-medium"
                            style={{ color: formAnalyticsApi.getRefillColor(field.refill_rate) }}
                          >
                            {field.refill_rate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-700">
                          {field.focus_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
