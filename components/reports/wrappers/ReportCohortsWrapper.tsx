"use client";

import React, { useEffect, useState } from "react";
import { secureApi } from "@/lib/secureApi";
import { 
    FiUsers, 
    FiSmartphone, 
    FiTablet, 
    FiMonitor, 
    FiMapPin, 
    FiEye, 
    FiClock, 
    FiMousePointer, 
    FiFilter 
} from "react-icons/fi";

interface CohortRule {
  field: string;
  operator: string;
  value: string | number;
}

interface Cohort {
  id: string;
  name: string;
  description: string;
  rules: CohortRule[];
  created_at: string;
}

const getRuleConfig = (field: string) => {
  switch (field) {
    case 'device_type': return { 
        icon: <FiSmartphone className="w-3.5 h-3.5" />, 
        bg: 'bg-violet-50', 
        text: 'text-violet-700', 
        border: 'border-violet-100' 
    };
    case 'country': return { 
        icon: <FiMapPin className="w-3.5 h-3.5" />, 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-100' 
    };
    case 'page_views': return { 
        icon: <FiEye className="w-3.5 h-3.5" />, 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-100' 
    };
    case 'session_duration': return { 
        icon: <FiClock className="w-3.5 h-3.5" />, 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-100' 
    };
    case 'has_rage_clicks': return { 
        icon: <FiMousePointer className="w-3.5 h-3.5" />, 
        bg: 'bg-rose-50', 
        text: 'text-rose-700', 
        border: 'border-rose-100' 
    };
    default: return { 
        icon: <FiFilter className="w-3.5 h-3.5" />, 
        bg: 'bg-gray-50', 
        text: 'text-gray-700', 
        border: 'border-gray-100' 
    };
  }
};

const COHORT_FIELDS = [
  { value: "device_type", label: "Device Type" },
  { value: "country", label: "Country" },
  { value: "page_views", label: "Page Views" },
  { value: "session_duration", label: "Session Duration" },
  { value: "has_rage_clicks", label: "Has Rage Clicks" },
  { value: "first_seen", label: "First Seen" },
];

export default function ReportCohortsWrapper({ siteId, days }: { siteId: string, days: number }) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCohorts = async () => {
        if (!siteId) return;
        setLoading(true);
        try {
            const data = await secureApi.cohorts.list(siteId);
            // @ts-ignore - The API returns { cohorts: [...] } but types might say otherwise
            setCohorts(data.cohorts || []);
        } catch (error) {
            console.error("Failed to load cohorts", error);
        } finally {
            setLoading(false);
        }
    };
    fetchCohorts();
  }, [siteId]);

  const [expandedCohort, setExpandedCohort] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [loadingMetrics, setLoadingMetrics] = useState<Record<string, boolean>>({});

  const toggleCohort = async (cohortId: string) => {
    if (expandedCohort === cohortId) {
        setExpandedCohort(null);
        return;
    }

    setExpandedCohort(cohortId);

    // Fetch metrics if not already loaded
    if (!metrics[cohortId]) {
        setLoadingMetrics(prev => ({ ...prev, [cohortId]: true }));
        try {
            const data = await secureApi.cohorts.metrics({
                siteId,
                cohortId,
                startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(), // Respect dynamic days
                endDate: new Date().toISOString()
            });
            setMetrics(prev => ({ ...prev, [cohortId]: data }));
        } catch (error) {
            console.error("Failed to load cohort metrics", error);
        } finally {
            setLoadingMetrics(prev => ({ ...prev, [cohortId]: false }));
        }
    }
  };

  if (loading) return <div className="text-gray-500 text-center py-8">Loading Cohorts...</div>;
  if (!cohorts || cohorts.length === 0) return <div className="text-gray-500 italic">No active cohorts defined.</div>;

  return (
    <div className="grid md:grid-cols-2 gap-6 break-inside-avoid">
        {cohorts.map(cohort => {
            const isExpanded = expandedCohort === cohort.id;
            const cohortMetrics = metrics[cohort.id];
            const isLoadingMetrics = loadingMetrics[cohort.id];

            return (
                <div 
                    key={cohort.id} 
                    onClick={() => toggleCohort(cohort.id)}
                    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col relative overflow-hidden group transition-all cursor-pointer hover:shadow-md ${isExpanded ? 'row-span-2' : ''}`}
                >
                     {/* Decorative Icon */}
                    <div className="absolute -right-6 -bottom-6 opacity-5 transform rotate-12 z-0">
                        <FiUsers className="w-32 h-32 text-indigo-600" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{cohort.name}</h3>
                                {cohort.description && <p className="text-gray-500 text-sm line-clamp-2">{cohort.description}</p>}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {cohort.rules.slice(0, 4).map((rule, i) => {
                                const config = getRuleConfig(rule.field);
                                return (
                                    <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${config.bg} ${config.text} ${config.border}`}>
                                        {config.icon}
                                        <span>{COHORT_FIELDS.find(f => f.value === rule.field)?.label}</span>
                                        <span className="opacity-60 font-light mx-0.5">|</span>
                                        <span className="font-bold">{String(rule.value)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                {isLoadingMetrics ? (
                                    <div className="text-center py-4 text-gray-500 text-sm">Loading metrics...</div>
                                ) : cohortMetrics ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <div className="text-xs text-gray-500 uppercase tracking-wide">Sessions</div>
                                                <div className="text-xl font-bold text-gray-900">{cohortMetrics.metrics?.sessions || 0}</div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <div className="text-xs text-gray-500 uppercase tracking-wide">Engagement</div>
                                                <div className="text-xl font-bold text-gray-900">{cohortMetrics.metrics?.eventsPerSession || 0} evt/sess</div>
                                            </div>
                                        </div>

                                        {cohortMetrics.topPages && cohortMetrics.topPages.length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Top Pages</div>
                                                <div className="space-y-1">
                                                    {cohortMetrics.topPages.slice(0, 3).map((page: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-gray-600 truncate max-w-[70%]">{page.page_path}</span>
                                                            <span className="font-medium text-gray-900">{page.views} views</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500 text-sm">No data available</div>
                                )}
                            </div>
                        )}
                        
                        {!isExpanded && (
                            <div className="mt-4 text-center">
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Click to view details</span>
                            </div>
                        )}
                    </div>
                    
                     <div className="mt-auto pt-4 border-t border-gray-50 text-xs text-gray-400">
                        Created {new Date(cohort.created_at).toLocaleDateString()}
                     </div>
                </div>
            );
        })}
    </div>
  );
}
