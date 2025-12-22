"use client";

import React, { useEffect, useState } from "react";
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useAI } from "@/context/AIProvider";
import {
  FiUsers,
  FiPlus,
  FiTrash2,
  FiFilter,
  FiCalendar,
  FiEye,
  FiBarChart2,
  FiX,
  FiCheck,
  FiMonitor,
  FiSmartphone,
  FiTablet,
  FiMapPin,
  FiMousePointer,
  FiClock,
  FiActivity,
  FiArrowRight,
  FiAlertTriangle,
} from "react-icons/fi";
import { FeatureLock } from "@/components/subscription/FeatureLock";
import { UpgradeModal } from "@/components/subscription/UpgradeModal";
import { useSubscription } from "@/app/context/SubscriptionContext";

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

interface CohortMetrics {
  sessions: number;
  totalEvents: number;
  sessionsWithClicks: number;
  totalClicks: number;
  totalScrolls: number;
  clickRate: string;
}

interface CohortDetails {
  cohort: Cohort;
  metrics: CohortMetrics;
  topPages: Array<{ page_path: string; views: string; sessions: string }>;
  deviceBreakdown: Array<{ device_type: string; sessions: string }>;
}

interface ComparisonData {
  cohortId: string;
  cohortName: string;
  sessions: number;
  events: number;
  clicks: number;
  eventsPerSession: string;
}

// Available fields for cohort rules
const COHORT_FIELDS = [
  { 
    value: "device_type", 
    label: "Device Type", 
    description: "Filter users based on their device category.",
    example: "mobile, desktop, tablet" 
  },
  { 
    value: "country", 
    label: "Country", 
    description: "Filter users based on their geographic location.",
    example: "US, UK, Sri Lanka, Canada" 
  },
  { 
    value: "page_views", 
    label: "Page Views", 
    description: "Filter users by the number of pages visited.",
    example: "greater_than 5, equals 1" 
  },
  { 
    value: "session_duration", 
    label: "Session Duration", 
    description: "Filter users by total time spent on site (in minutes).",
    example: "greater_than 2, less_than 10" 
  },
  { 
    value: "has_rage_clicks", 
    label: "Has Rage Clicks", 
    description: "Identify users who repeatedly clicked in frustration.",
    example: "true, false" 
  },
  { 
    value: "first_seen", 
    label: "First Seen", 
    description: "Filter users based on when they first visited.",
    example: "greater_than 2023-01-01" 
  },
];

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

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

// Validation Error Modal
interface ValidationErrorInfo {
  errors: string[];
  cohortName: string;
  rules: CohortRule[];
  validFields?: string[];
}

const ValidationErrorModal = ({
  errorInfo,
  onClose,
  onFixWithAI,
}: {
  errorInfo: ValidationErrorInfo;
  onClose: () => void;
  onFixWithAI: () => void;
}) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
      {/* Header */}
      <div className="bg-red-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <FiX className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Invalid Cohort Rules</h3>
            <p className="text-white/80 text-sm">We found issues with your cohort configuration</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
            The cohort <span className="font-semibold text-gray-900 dark:text-white">&quot;{errorInfo.cohortName}&quot;</span> cannot be created due to the following errors:
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <ul className="space-y-2">
              {errorInfo.errors.map((error, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Can Help!</p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Our AI assistant can automatically fix these rules and suggest valid configurations.
              </p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onFixWithAI}
            className="flex-1 py-2.5 px-4 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-4 h-4" />
            Fix with AI
          </button>
        </div>
      </div>
    </div>
  </div>
);

// View Cohort Modal
const ViewCohortModal = ({
  cohortDetails,
  onClose,
  loading,
}: {
  cohortDetails: CohortDetails | null;
  onClose: () => void;
  loading: boolean;
}) => {
  if (!cohortDetails && !loading) return null;

  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mobile": return <FiSmartphone className="w-4 h-4" />;
      case "tablet": return <FiTablet className="w-4 h-4" />;
      default: return <FiMonitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FiActivity className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{loading ? "Loading..." : cohortDetails?.cohort.name}</h2>
                    <p className="text-sm text-gray-500">Deep dive analysis</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors">
                <FiX className="w-5 h-5" />
            </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner message="Analyzing cohort data..." fullScreen={false} />
          </div>
        ) : cohortDetails && (
          <div className="p-8 space-y-8">
            
            {/* Cohort Definition Pills */}
            <div className="flex flex-wrap gap-2">
                {cohortDetails.cohort.rules.map((rule, i) => {
                    const config = getRuleConfig(rule.field);
                    return (
                        <div key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${config.bg} ${config.text} ${config.border}`}>
                            {config.icon}
                            <span>{COHORT_FIELDS.find(f => f.value === rule.field)?.label} is <span className="font-bold">{String(rule.value)}</span></span>
                        </div>
                    );
                })}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                  { label: "Sessions", value: cohortDetails.metrics.sessions.toLocaleString(), color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Events", value: cohortDetails.metrics.totalEvents.toLocaleString(), color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Clicks", value: cohortDetails.metrics.totalClicks.toLocaleString(), color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Click Rate", value: `${cohortDetails.metrics.clickRate}%`, color: "text-amber-600", bg: "bg-amber-50" }
              ].map((stat, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-100 hover:shadow-lg transition-all group">
                        <div className="text-sm text-gray-500 font-medium mb-1">{stat.label}</div>
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Device Breakdown */}
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiSmartphone className="w-5 h-5 text-gray-400" />
                        Device Usage
                    </h3>
                    <div className="space-y-3">
                        {cohortDetails.deviceBreakdown.length > 0 ? cohortDetails.deviceBreakdown.map((device) => (
                            <div key={device.device_type} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm">
                                <span className="capitalize text-gray-700 font-medium flex items-center gap-2">
                                    {device.device_type === 'mobile' ? <FiSmartphone className="text-violet-500" /> : 
                                     device.device_type === 'tablet' ? <FiTablet className="text-violet-500" /> : 
                                     <FiMonitor className="text-violet-500" />}
                                    {device.device_type || "Unknown"}
                                </span>
                                <span className="font-bold text-gray-900">{device.sessions} <span className="text-gray-400 text-xs font-normal">sessions</span></span>
                            </div>
                        )) : <p className="text-gray-400 text-sm">No device data available</p>}
                    </div>
                </div>

                {/* Top Pages */}
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiEye className="w-5 h-5 text-gray-400" />
                        Most Viewed Pages
                    </h3>
                     <div className="space-y-3">
                        {cohortDetails.topPages.length > 0 ? cohortDetails.topPages.slice(0, 5).map((page, i) => (
                            <div key={i} className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center text-xs font-bold font-mono">
                                        {i + 1}
                                    </div>
                                    <code className="text-sm text-gray-600 font-medium">{page.page_path}</code>
                                </div>
                                <div className="text-sm font-bold text-gray-900 relative z-10">
                                    {page.views}
                                </div>
                                {/* Subtle progress bar effect */}
                                <div className="absolute left-0 top-0 bottom-0 bg-blue-50/50 transition-all duration-500" style={{ width: `${Math.min(100, (parseInt(page.views) / parseInt(cohortDetails.topPages[0].views)) * 100)}%` }} />
                            </div>
                        )) : <p className="text-gray-400 text-sm">No page data available</p>}
                    </div>
                </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

// Compare Cohorts Modal
const CompareCohortModal = ({
  cohorts,
  comparison,
  onClose,
  onCompare,
  loading,
}: {
  cohorts: Cohort[];
  comparison: ComparisonData[] | null;
  onClose: () => void;
  onCompare: (ids: string[]) => void;
  loading: boolean;
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleCohort = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiBarChart2 className="w-5 h-5 text-indigo-600" />
            Compare Cohorts
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Cohort Selection */}
          {!comparison && (
            <>
              <p className="text-gray-600 mb-4">Select 2 or more cohorts to compare:</p>
              <div className="grid md:grid-cols-2 gap-3 mb-6">
                {cohorts.map(cohort => (
                  <button
                    key={cohort.id}
                    onClick={() => toggleCohort(cohort.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedIds.includes(cohort.id)
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cohort.name}</span>
                      {selectedIds.includes(cohort.id) && (
                        <FiCheck className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    {cohort.description && (
                      <p className="text-sm text-gray-500 mt-1">{cohort.description}</p>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onCompare(selectedIds)}
                disabled={selectedIds.length < 2 || loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {loading ? "Comparing..." : `Compare ${selectedIds.length} Cohorts`}
              </button>
            </>
          )}

          {/* Comparison Results */}
          {comparison && (
            <div>
              <button
                onClick={() => onCompare([])}
                className="text-indigo-600 hover:text-indigo-700 mb-4 text-sm flex items-center gap-1"
              >
                ← Back to selection
              </button>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Cohort</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Sessions</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Events</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Clicks</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Events/Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c, i) => (
                      <tr key={c.cohortId} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                        <td className="py-3 px-4 font-medium">{c.cohortName}</td>
                        <td className="py-3 px-4 text-right text-indigo-600 font-semibold">{c.sessions.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{c.events.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{c.clicks.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold">{c.eventsPerSession}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



// Delete Confirmation Modal
const DeleteCohortModal = ({
  cohortName,
  isOpen,
  onClose,
  onConfirm,
}: {
  cohortName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden transform transition-all">
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Cohort?</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete <span className="font-semibold text-gray-900">&quot;{cohortName}&quot;</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rules Reference Section
const RulesReference = () => (
    <div className="mt-12 pt-10 border-t border-gray-200">
        <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiFilter className="w-5 h-5 text-indigo-600" />
                Available Cohort Rules
            </h3>
            <p className="text-gray-500 text-sm">Use these fields to segment your audience effectively.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COHORT_FIELDS.map((field) => {
                const config = getRuleConfig(field.value);
                return (
                    <div key={field.value} className="bg-white border border-indigo-200 rounded-xl p-4 flex gap-4 hover:border-indigo-500 transition-colors">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.text}`}>
                            {React.cloneElement(config.icon as any, { className: "w-5 h-5" })}
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-sm mb-1">{field.label}</div>
                            <p className="text-xs text-gray-500 mb-2 leading-relaxed">{field.description}</p>
                            <div className="text-[10px] font-mono bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100 inline-block">
                                e.g. {field.example}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

// Cohort card component with View button
const CohortCard = ({
  cohort,
  onDelete,
  onView,
  onSelect,
  selected,
}: {
  cohort: Cohort;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onSelect?: (id: string) => void;
  selected?: boolean;
}) => (
  <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border relative overflow-hidden group ${selected ? 'border-indigo-500 ring-4 ring-indigo-50/50' : 'border-gray-200 hover:border-indigo-200'}`}>
    {/* Background Reveal Icon */}
    <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-5 transition-all duration-500 transform translate-y-8 group-hover:translate-y-0 rotate-12 z-0 pointer-events-none">
        <FiUsers className="w-32 h-32 text-indigo-600" />
    </div>
    
    <div className="p-6 flex-1 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">{cohort.name}</h3>
                {cohort.description && <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{cohort.description}</p>}
            </div>
            
             {/* Simple Actions */}
            <div className="flex gap-1 -mr-2 -mt-2">
                <button
                onClick={(e) => { e.stopPropagation(); onDelete(cohort.id); }}
                className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors hover:bg-red-50"
                title="Delete"
                >
                <FiTrash2 className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* Smart Chips */}
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
             {cohort.rules.length > 4 && (
                <div className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 text-xs font-medium bg-gray-50">
                    +{cohort.rules.length - 4} more
                </div>
            )}
        </div>
    </div>

    {/* Footer Action */}
    <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between rounded-b-xl">
        <span className="text-xs text-gray-400 font-medium">
            Created {new Date(cohort.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
        <button 
            onClick={() => onView(cohort.id)} 
            className="text-sm font-semibold text-indigo-600 flex items-center gap-2 hover:gap-3 transition-all"
        >
            View Analysis <FiArrowRight className="w-4 h-4" />
        </button>
    </div>
  </div>
);

// Create cohort modal
const CreateCohortModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; rules: CohortRule[] }) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<CohortRule[]>([
    { field: "device_type", operator: "equals", value: "" }
  ]);
  const [saving, setSaving] = useState(false);

  const addRule = () => {
    setRules([...rules, { field: "device_type", operator: "equals", value: "" }]);
  };

  const updateRule = (index: number, updates: Partial<CohortRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rules.some(r => !r.value)) return;

    setSaving(true);
    try {
      await onSubmit({ name, description, rules });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Cohort</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Mobile Power Users"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rules</label>
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={rule.field}
                    onChange={e => updateRule(i, { field: e.target.value })}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {COHORT_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={rule.operator}
                    onChange={e => updateRule(i, { operator: e.target.value })}
                    className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {OPERATORS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={String(rule.value)}
                    onChange={e => updateRule(i, { value: e.target.value })}
                    className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Value"
                    required
                  />
                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRule(i)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRule}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <FiPlus className="w-4 h-4" /> Add Rule
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Cohort"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CohortsDashboard() {
  const { selectedSiteId, sites, sitesLoading } = useSite();
  const { hasFeature } = useSubscription(); // Add subscription context
  const { openChat, setOnCohortCreate } = useAI();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showAIUpgradeModal, setShowAIUpgradeModal] = useState(false); // New state for AI upgrade
  const [viewCohortId, setViewCohortId] = useState<string | null>(null);
  const [cohortDetails, setCohortDetails] = useState<CohortDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonData[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [validationError, setValidationError] = useState<ValidationErrorInfo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Handle AI cohort creation - register callback
  const handleAICreate = () => {
    // Check for AI feature access
    if (!hasFeature('ai_cohort_generator')) {
      setShowAIUpgradeModal(true);
      return;
    }

    openChat('cohort', {
      existingCohorts: cohorts.map(c => c.name),
      availableFields: ['device_type', 'country', 'page_views', 'session_duration', 'has_rage_clicks', 'first_seen'],
    });
  };

  // Register cohort creation callback
  useEffect(() => {
    const createCohortFromAI = async (data: { name: string; description: string; rules: CohortRule[] }) => {
      if (!selectedSiteId) throw new Error('No site selected');
      await secureApi.cohorts.create({ siteId: selectedSiteId, ...data });
      fetchCohorts();
    };
    
    setOnCohortCreate(createCohortFromAI);
    
    return () => {
      setOnCohortCreate(null);
    };
  }, [selectedSiteId, setOnCohortCreate]);

  // Fetch cohorts using secure API
  const fetchCohorts = async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      // SECURITY: Uses POST with encrypted response
      const data = await secureApi.cohorts.list(selectedSiteId);
      setCohorts((data.cohorts as Cohort[]) || []);
    } catch (error) {
      console.error("Failed to fetch cohorts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, [selectedSiteId]);

  const handleCreate = async (data: { name: string; description: string; rules: CohortRule[] }) => {
    try {
      await secureApi.cohorts.create({ siteId: selectedSiteId, ...data });
      fetchCohorts();
      setShowModal(false);
    } catch (error: unknown) {
      console.error("Failed to create cohort:", error);
      setShowModal(false);
      
      // ApiError has details property with the full response data
      const apiError = error as { 
        details?: { error?: string; details?: string[]; hint?: string; validFields?: string[] }; 
        message?: string;
        status?: number;
      };
      
      // Check if it's a validation error (400)
      const errorDetails = apiError.details?.details;
      const errorMessage = apiError.details?.error || apiError.message || 'Unknown error';
      
      if (errorDetails && errorDetails.length > 0) {
        // Show styled validation error modal
        setValidationError({
          errors: errorDetails,
          cohortName: data.name,
          rules: data.rules,
          validFields: apiError.details?.validFields,
        });
      } else if (errorMessage.includes('Invalid')) {
        // Fallback for validation errors without details array
        setValidationError({
          errors: [errorMessage],
          cohortName: data.name,
          rules: data.rules,
        });
      } else {
        alert(errorMessage);
      }
    }
  };

  // Handle fix with AI from validation error modal
  const handleFixWithAI = () => {
    if (!validationError) return;
    
    const errorText = validationError.errors.join('\n');
    const rulesJson = JSON.stringify(validationError.rules, null, 2);
    
    setValidationError(null);
    openChat('cohort', {
      validationError: true,
      errorDetails: errorText,
      invalidRules: validationError.rules,
      cohortName: validationError.cohortName,
      validFields: validationError.validFields,
      autoMessage: `My cohort "${validationError.cohortName}" has invalid rules:\n\nErrors:\n${errorText}\n\nMy rules were:\n${rulesJson}\n\nPlease fix these rules and give me valid ones.`
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
        await secureApi.cohorts.delete(deleteId);
        setCohorts(prev => prev.filter(c => c.id !== deleteId));
        setDeleteId(null);
    } catch (error) {
        console.error("Failed to delete cohort:", error);
    }
  };

  const handleView = async (cohortId: string) => {
    setViewCohortId(cohortId);
    setDetailsLoading(true);
    setCohortDetails(null);
    
    try {
      const data = await secureApi.cohorts.metrics({ siteId: selectedSiteId, cohortId });
      setCohortDetails(data as CohortDetails);
    } catch (error) {
      console.error("Failed to fetch cohort metrics:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCompare = async (cohortIds: string[]) => {
    if (cohortIds.length === 0) {
      setComparison(null);
      return;
    }
    
    if (cohortIds.length < 2) return;
    
    setCompareLoading(true);
    try {
      const data = await secureApi.cohorts.metrics({ siteId: selectedSiteId, cohortIds });
      setComparison((data as any).comparison);
    } catch (error) {
      console.error("Failed to compare cohorts:", error);
    } finally {
      setCompareLoading(false);
    }
  };

  if (sitesLoading) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner /></div>;
  }

  if (sites.length === 0) return <NoSitesAvailable />;

  if (!selectedSiteId) {
    return <NoSiteSelected featureName="cohorts" description="Create and analyze behavioral cohorts." />;
  }

  return (
    <FeatureLock feature="cohorts" title="Unlock Cohorts" description="Create behavioral cohorts to segment and analyze users">
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                    <FiUsers className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Behavioral Cohorts</h1>
                    <p className="text-gray-500">Segment users by behavior to discover deep insights</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShowCompareModal(true)}
                    disabled={cohorts.length < 2}
                    className="px-4 py-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <FiBarChart2 className="w-4 h-4" />
                    Compare
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm hover:shadow"
                >
                    <FiPlus className="w-5 h-5" />
                    New Cohort
                </button>
            </div>
        </div>

        {/* Educational Banner */}
        <div className="mb-8 bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 relative overflow-hidden group hover:shadow-sm transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FiUsers className="w-40 h-40 text-indigo-600 -rotate-12 transform translate-x-12 -translate-y-8" />
            </div>
            <div className="relative z-10 max-w-3xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <FiActivity className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">What are Behavioral Cohorts?</h3>
                </div>
                <p className="text-gray-600 mb-5 leading-relaxed pl-10">
                    Cohorts allow you to segment your users based on specific actions or attributes—like "Users from Canada" or "Visitors who rage clicked". 
                    Creating cohorts helps you understand how different groups behave, convert, and experience your site differently.
                </p>
                <div className="flex flex-wrap gap-3 pl-10">
                    <span className="text-xs font-semibold bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 hover:border-indigo-200 transition-colors">
                        <FiMapPin className="w-3.5 h-3.5 text-indigo-500" />
                        By Location
                    </span>
                    <span className="text-xs font-semibold bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 hover:border-indigo-200 transition-colors">
                        <FiSmartphone className="w-3.5 h-3.5 text-indigo-500" />
                        By Device
                    </span>
                    <span className="text-xs font-semibold bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 hover:border-indigo-200 transition-colors">
                        <FiMousePointer className="w-3.5 h-3.5 text-indigo-500" />
                        By Behavior
                    </span>
                    <span className="text-xs font-semibold bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2 hover:border-indigo-200 transition-colors">
                        <FiClock className="w-3.5 h-3.5 text-indigo-500" />
                        By Duration
                    </span>
                </div>
            </div>
        </div>

        {/* AI Assistant Banner (if authorized) */}
        {hasFeature('ai_cohort_generator') && (
            <div className="mb-6 flex justify-end">
                  <button
                    onClick={handleAICreate}
                    className="group"
                  >
                    <div className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow hover:shadow-lg transition-all">
                        <SparklesIcon className="w-4 h-4 animate-pulse" />
                        <span className="font-medium">Generate with AI</span>
                    </div>
                  </button>
            </div>
        )}

        {/* Content */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        ) : cohorts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiUsers className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Cohorts Yet</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                    Create your first cohort to start analyzing specific user segments.
                </p>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    <FiPlus className="w-5 h-5" />
                    Create First Cohort
                </button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cohorts.map((cohort) => (
                    <CohortCard
                        key={cohort.id}
                        cohort={cohort}
                        onDelete={handleDeleteClick}
                        onView={handleView}
                        onSelect={() => {}} 
                    />
                ))}
                
                {/* Add New Card (Ghost) */}
                <button
                    onClick={() => setShowModal(true)}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group min-h-[200px]"
                >
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                        <FiPlus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">Create New Cohort</span>
                </button>
            </div>
        )}

        {/* Rules Reference */}
        <RulesReference />

        {/* Modals */}
        {showModal && (
          <CreateCohortModal
            onClose={() => setShowModal(false)}
            onSubmit={handleCreate}
          />
        )}

        <DeleteCohortModal 
            isOpen={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={confirmDelete}
            cohortName={cohorts.find(c => c.id === deleteId)?.name || "Cohort"}
        />

        {viewCohortId && (
        <ViewCohortModal
          cohortDetails={cohortDetails}
          loading={detailsLoading}
          onClose={() => {
            setCohortDetails(null);
            setViewCohortId(null);
          }}
        />
        )}

        {showCompareModal && (
          <CompareCohortModal
            cohorts={cohorts}
            comparison={comparison}
            loading={compareLoading}
            onClose={() => {
              setShowCompareModal(false);
              setComparison(null);
            }}
            onCompare={handleCompare}
          />
        )}
        
        {validationError && (
          <ValidationErrorModal
            errorInfo={validationError}
            onClose={() => setValidationError(null)}
            onFixWithAI={handleFixWithAI}
          />
        )}

        {showAIUpgradeModal && (
          <UpgradeModal
            isOpen={showAIUpgradeModal}
            onClose={() => setShowAIUpgradeModal(false)}
            planName="Pro"
            featureName="AI Cohort Generator"
          />
        )}
      </div>
    </div>
    </FeatureLock>
  );
}
