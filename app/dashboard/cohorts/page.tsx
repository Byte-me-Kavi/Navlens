"use client";

import React, { useEffect, useState } from "react";
import { useSite } from "@/app/context/SiteContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoSiteSelected, { NoSitesAvailable } from "@/components/NoSiteSelected";
import {
  FiUsers,
  FiPlus,
  FiTrash2,
  FiFilter,
  FiCalendar,
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

// Cohort card component
const CohortCard = ({ 
  cohort, 
  onDelete 
}: { 
  cohort: Cohort; 
  onDelete: (id: string) => void;
}) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-semibold text-gray-900">{cohort.name}</h3>
        {cohort.description && (
          <p className="text-sm text-gray-500 mt-1">{cohort.description}</p>
        )}
      </div>
      <button
        onClick={() => onDelete(cohort.id)}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <FiTrash2 className="w-4 h-4" />
      </button>
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

    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-gray-500">
      <FiCalendar className="w-3 h-3 mr-1" />
      Created {new Date(cohort.created_at).toLocaleDateString()}
    </div>
  </div>
);

// Create cohort modal
const CreateCohortModal = ({ 
  onClose, 
  onSubmit 
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

  const fetchCohorts = async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/cohorts?siteId=${selectedSiteId}`);
      if (response.ok) {
        const data = await response.json();
        setCohorts(data.cohorts || []);
      }
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
    const response = await fetch("/api/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: selectedSiteId, ...data }),
    });
    if (response.ok) {
      fetchCohorts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this cohort?")) return;
    const response = await fetch(`/api/cohorts?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      setCohorts(prev => prev.filter(c => c.id !== id));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
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
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <FiPlus className="w-5 h-5" />
            New Cohort
          </button>
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
              <CohortCard key={cohort.id} cohort={cohort} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <CreateCohortModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
