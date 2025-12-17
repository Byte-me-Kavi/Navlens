"use client";

import React, { useEffect, useState } from "react";
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
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
  { value: "device_type", label: "Device Type" },
  { value: "country", label: "Country" },
  { value: "page_views", label: "Page Views" },
  { value: "session_duration", label: "Session Duration (min)" },
  { value: "has_rage_clicks", label: "Has Rage Clicks" },
  { value: "first_seen", label: "First Seen" },
];

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
];

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiEye className="w-5 h-5 text-blue-600" />
            {loading ? "Loading..." : cohortDetails?.cohort.name}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner message="Loading cohort metrics..." />
          </div>
        ) : cohortDetails && (
          <div className="p-6 space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-700">{cohortDetails.metrics.sessions.toLocaleString()}</div>
                <div className="text-sm text-blue-600">Sessions</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-700">{cohortDetails.metrics.totalEvents.toLocaleString()}</div>
                <div className="text-sm text-green-600">Events</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-700">{cohortDetails.metrics.totalClicks.toLocaleString()}</div>
                <div className="text-sm text-purple-600">Clicks</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                <div className="text-2xl font-bold text-orange-700">{cohortDetails.metrics.clickRate}%</div>
                <div className="text-sm text-orange-600">Click Rate</div>
              </div>
            </div>

            {/* Device Breakdown */}
            {cohortDetails.deviceBreakdown.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Device Distribution</h3>
                <div className="flex gap-4 flex-wrap">
                  {cohortDetails.deviceBreakdown.map((device) => (
                    <div key={device.device_type} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                      {getDeviceIcon(device.device_type)}
                      <span className="capitalize">{device.device_type || "Unknown"}</span>
                      <span className="font-semibold text-blue-600">{device.sessions}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Pages */}
            {cohortDetails.topPages.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Top Pages</h3>
                <div className="space-y-2">
                  {cohortDetails.topPages.slice(0, 5).map((page, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                      <code className="text-sm text-gray-700">{page.page_path}</code>
                      <div className="text-sm">
                        <span className="font-semibold text-blue-600">{page.views}</span>
                        <span className="text-gray-500 ml-1">views</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiFilter className="w-4 h-4" />
                Cohort Rules
              </h3>
              <div className="flex gap-2 flex-wrap">
                {cohortDetails.cohort.rules.map((rule, i) => (
                  <div key={i} className="bg-blue-50 text-blue-700 rounded-lg px-3 py-1 text-sm">
                    {COHORT_FIELDS.find(f => f.value === rule.field)?.label || rule.field}{" "}
                    {rule.operator.replace("_", " ")} <strong>{String(rule.value)}</strong>
                  </div>
                ))}
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
            <FiBarChart2 className="w-5 h-5 text-blue-600" />
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
                        ? "border-blue-500 bg-blue-50"
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
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
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
                className="text-blue-600 hover:text-blue-700 mb-4 text-sm flex items-center gap-1"
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
                        <td className="py-3 px-4 text-right text-blue-600 font-semibold">{c.sessions.toLocaleString()}</td>
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
  <div className={`bg-white rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'}`}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-semibold text-gray-900">{cohort.name}</h3>
        {cohort.description && (
          <p className="text-sm text-gray-500 mt-1">{cohort.description}</p>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onView(cohort.id)}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="View Metrics"
        >
          <FiEye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(cohort.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Rules */}
    <div className="space-y-2 mt-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        <FiFilter className="w-3 h-3" />
        Rules
      </div>
      {cohort.rules.map((rule, i) => (
        <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">
            {COHORT_FIELDS.find(f => f.value === rule.field)?.label || rule.field}
          </span>
          <span className="text-gray-500">{rule.operator.replace("_", " ")}</span>
          <span className="font-semibold text-blue-600">{String(rule.value)}</span>
        </div>
      ))}
    </div>

    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
      <div className="flex items-center">
        <FiCalendar className="w-3 h-3 mr-1" />
        Created {new Date(cohort.created_at).toLocaleDateString()}
      </div>
      <button
        onClick={() => onView(cohort.id)}
        className="text-blue-600 hover:text-blue-700 font-medium"
      >
        View Metrics →
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
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [viewCohortId, setViewCohortId] = useState<string | null>(null);
  const [cohortDetails, setCohortDetails] = useState<CohortDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonData[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

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
    } catch (error) {
      console.error("Failed to create cohort:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cohort?")) return;
    try {
      await secureApi.cohorts.delete(id);
      setCohorts(prev => prev.filter(c => c.id !== id));
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiUsers className="w-6 h-6 text-blue-600" />
              Cohort Analysis
            </h1>
            <p className="text-gray-600 mt-1">
              Create behavioral cohorts to segment and analyze users
            </p>
          </div>
          <div className="flex gap-2">
            {cohorts.length >= 2 && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2 font-medium"
              >
                <FiBarChart2 className="w-5 h-5" />
                Compare
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
            >
              <FiPlus className="w-5 h-5" />
              New Cohort
            </button>
          </div>
        </div>

        {/* Cohorts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner message="Loading cohorts..." />
          </div>
        ) : cohorts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <FiUsers className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cohorts Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first cohort to start segmenting users based on behavior.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Your First Cohort
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cohorts.map(cohort => (
              <CohortCard
                key={cohort.id}
                cohort={cohort}
                onDelete={handleDelete}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <CreateCohortModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {viewCohortId && (
        <ViewCohortModal
          cohortDetails={cohortDetails}
          onClose={() => {
            setViewCohortId(null);
            setCohortDetails(null);
          }}
          loading={detailsLoading}
        />
      )}

      {showCompareModal && (
        <CompareCohortModal
          cohorts={cohorts}
          comparison={comparison}
          onClose={() => {
            setShowCompareModal(false);
            setComparison(null);
          }}
          onCompare={handleCompare}
          loading={compareLoading}
        />
      )}
    </div>
  );
}
