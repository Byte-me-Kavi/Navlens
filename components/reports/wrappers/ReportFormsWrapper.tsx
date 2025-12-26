"use client";

import React from "react";
// secureApi unused
import { useFormList, useFormMetrics, formAnalyticsApi } from "@/features/form-analytics";
import { FiFileText } from 'react-icons/fi';
import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const FUNNEL_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#059669', '#2563eb',
];

// Top Form Detail Component
function FormDetailItem({ formId, siteId, formName, days, shareToken }: { formId: string, siteId: string, formName: string, days: number, shareToken?: string }) {
    const { fields, overallDropoff, avgTimeMs, isLoading } = useFormMetrics({
        siteId,
        formId,
        days: days,
        enabled: true,
        shareToken,
    });

    if (isLoading) return <div className="h-64 bg-gray-50 animate-pulse rounded-xl mb-6"></div>;
    if (!fields || fields.length === 0) return null;

    // Filter and prepare data
    const filteredFields = fields.filter(field => field.field_name || field.field_id);
    const firstFieldFocus = filteredFields[0]?.focus_count || 1;
    
    const funnelData = filteredFields.map((field, index) => {
      const displayName = (field.field_name || field.field_id || '').includes('[object')
        ? `Field ${index + 1}`
        : (field.field_name || field.field_id || 'Unknown');
      
      const retentionPercent = Math.round((field.focus_count / firstFieldFocus) * 100);
      
      return {
        name: displayName,
        value: field.focus_count,
        retentionPercent,
        dropOff: field.drop_off_rate,
      };
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6 break-inside-avoid">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                    <FiFileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                     <h3 className="text-lg font-bold text-gray-900">{formName} Analysis</h3>
                     <p className="text-sm text-gray-500">Field-level performance</p>
                </div>
             </div>

             <div className="grid grid-cols-3 gap-4 mb-6">
                 <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                     <div className="text-xl font-bold text-emerald-700">{formAnalyticsApi.formatTime(avgTimeMs)}</div>
                     <div className="text-xs text-emerald-600 uppercase">Avg Time</div>
                 </div>
                 <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 text-center">
                     <div className="text-xl font-bold text-orange-700">
                         {Number.isFinite(overallDropoff) && overallDropoff >= 0 ? `${overallDropoff}%` : '0%'}
                     </div>
                     <div className="text-xs text-orange-600 uppercase">Drop-off Rate</div>
                 </div>
                 <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                     <div className="text-xl font-bold text-indigo-700">{fields.length}</div>
                     <div className="text-xs text-indigo-600 uppercase">Fields</div>
                 </div>
             </div>
             
             <h4 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Drop-off Visualization</h4>
             <div className="h-[300px] w-full bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsFunnelChart>
                      <Tooltip />
                      <Funnel
                        dataKey="value"
                        data={funnelData}
                        isAnimationActive={false}
                      >
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                        ))}
                        <LabelList position="right" fill="#4b5563" stroke="none" dataKey="name" />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <LabelList position="center" fill="#fff" stroke="none" dataKey="retentionPercent" formatter={(val:any) => `${val}%`} />
                      </Funnel>
                    </RechartsFunnelChart>
                  </ResponsiveContainer>
             </div>
        </div>
    );
}

export default function ReportFormsWrapper({ siteId, days, shareToken }: { siteId: string, days: number, shareToken?: string }) {
  const { forms, isLoading } = useFormList({
    siteId,
    days: days,
    enabled: !!siteId,
    shareToken,
  });

  if (isLoading) return <div className="text-gray-500 text-center py-8">Loading Forms...</div>;
  if (!forms || forms.length === 0) return <div className="text-gray-500 italic">No form data detected.</div>;

  // Show details for the top form (most submissions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topForm = forms.reduce((prev: any, current: any) => (prev.total_submissions > current.total_submissions) ? prev : current);

  return (
    <div className="space-y-6">
        {/* Forms Summary List */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden break-inside-avoid">
             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">
                 Identified Forms
             </div>
             <table className="w-full text-sm">
                 <thead>
                     <tr className="text-left text-gray-500 border-b border-gray-100">
                         <th className="px-6 py-3 font-medium">Form ID</th>
                         <th className="px-6 py-3 font-medium text-right">Submissions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                     {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                     {forms.slice(0, 5).map((form: any) => (
                         <tr key={form.form_id}>
                             <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-[200px]" title={form.form_id}>
                                 {form.form_id}
                             </td>
                             <td className="px-6 py-3 text-right text-gray-600">
                                 {form.total_submissions.toLocaleString()}
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
        </div>

        {/* Detailed Analysis for Top Form */}
        <FormDetailItem formId={topForm.form_id} siteId={siteId} formName={topForm.form_id} days={days} shareToken={shareToken} />
    </div>
  );
}
