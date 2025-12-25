"use client";

import React, { useEffect, useState } from "react";
import { secureApi } from "@/lib/secureApi";
import { useFunnelAnalysis, FunnelChart } from "@/features/funnels";
import { FunnelIcon, ChartBarIcon } from "@heroicons/react/24/outline";

// Individual Funnel Item Component
function ReportFunnelItem({ funnel, siteId, days }: { funnel: any, siteId: string, days: number }) {
  const [dateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  });

  const { data: analysis, loading, error } = useFunnelAnalysis({
    funnelId: funnel.id,
    siteId,
    startDate: dateRange.startDate.split('T')[0],
    endDate: dateRange.endDate.split('T')[0],
  });

  if (loading) return <div className="animate-pulse h-64 bg-gray-50 rounded-xl mb-4"></div>;
  if (error || !analysis) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6 break-inside-avoid">
       <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <FunnelIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900">{funnel.name}</h3>
                <p className="text-sm text-gray-500">{funnel.steps?.length || 0} Steps • {days} Day Analysis</p>
            </div>
       </div>
       
       {/* High Level Stats */}
       <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                 <div className="text-xl font-bold text-gray-900">{analysis.total_sessions.toLocaleString()}</div>
                 <div className="text-xs text-gray-500 uppercase">Sessions</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                 <div className={`text-xl font-bold ${
                      analysis.overall_conversion_rate >= 20 ? "text-emerald-600" : 
                      analysis.overall_conversion_rate >= 10 ? "text-amber-600" : "text-red-600"
                 }`}>
                     {analysis.overall_conversion_rate.toFixed(1)}%
                 </div>
                 <div className="text-xs text-gray-500 uppercase">Conversion</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                 <div className="text-xl font-bold text-indigo-600">{analysis.step_results[analysis.step_results.length - 1]?.visitors.toLocaleString() || 0}</div>
                 <div className="text-xs text-gray-500 uppercase">Completed</div>
            </div>
       </div>

       {/* Chart */}
       <div className="w-full mb-8">
           <FunnelChart 
               steps={analysis.step_results}
               totalSessions={analysis.total_sessions}
           />
       </div>
    </div>
  );
}

export default function ReportFunnelsWrapper({ siteId, days }: { siteId: string, days: number }) {
  const [funnels, setFunnels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnels = async () => {
        if (!siteId) return;
        setLoading(true);
        try {
            const data = await secureApi.funnels.list(siteId);
            // @ts-ignore - The API returns { funnels: [...] } but types might say otherwise
            setFunnels(data.funnels || []);
        } catch (error) {
            console.error("Failed to list funnels", error);
        } finally {
            setLoading(false);
        }
    };
    fetchFunnels();
  }, [siteId]);

  if (loading) return <div className="text-gray-500 text-center py-8">Loading Funnels...</div>;
  if (funnels.length === 0) return <div className="text-gray-500 italic">No funnels configured for this site.</div>;

  return (
    <div className="space-y-6">
        {funnels.map(funnel => (
            <ReportFunnelItem key={funnel.id} funnel={funnel} siteId={siteId} days={days} />
        ))}
    </div>
  );
}
