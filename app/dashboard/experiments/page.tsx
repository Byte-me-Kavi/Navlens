"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  BeakerIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { useSite } from "@/app/context/SiteContext";

// Types
interface Variant {
  id: string;
  name: string;
  weight: number;
}

interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "running" | "paused" | "completed";
  variants: Variant[];
  traffic_percentage: number;
  goal_event?: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

interface VariantStats {
  variant_id: string;
  variant_name: string;
  users: number;
  conversions: number;
  conversion_rate: number;
}

interface ExperimentResults {
  experiment_id: string;
  total_users: number;
  variants: VariantStats[];
  winner?: string;
  confidence_level?: number;
  z_score?: number;
  lift_percentage?: number;
  is_significant: boolean;
  status_message?: string;
}

// Status badge component
function StatusBadge({ status }: { status: Experiment["status"] }) {
  const config = {
    draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
    running: { bg: "bg-green-100", text: "text-green-700", label: "Running" },
    paused: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Paused" },
    completed: { bg: "bg-blue-100", text: "text-blue-700", label: "Completed" },
  };
  const { bg, text, label } = config[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}
    >
      {label}
    </span>
  );
}

// Confidence bar component
function ConfidenceBar({ level }: { level: number }) {
  const getColor = () => {
    if (level >= 95) return "bg-green-500";
    if (level >= 90) return "bg-yellow-500";
    if (level >= 80) return "bg-orange-500";
    return "bg-gray-400";
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${getColor()}`}
        style={{ width: `${Math.min(level, 100)}%` }}
      />
    </div>
  );
}

// Create experiment modal
function CreateExperimentModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    goalEvent: string;
    variantCount: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goalEvent, setGoalEvent] = useState("conversion");
  const [variantCount, setVariantCount] = useState(2);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, goalEvent, variantCount });
    setName("");
    setDescription("");
    setGoalEvent("conversion");
    setVariantCount(2);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">Create New Experiment</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Experiment Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Homepage CTA Color Test"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What are you testing?"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Event
            </label>
            <select
              value={goalEvent}
              onChange={(e) => setGoalEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="conversion">Conversion</option>
              <option value="signup">Signup</option>
              <option value="purchase">Purchase</option>
              <option value="click">Click</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Variants
            </label>
            <select
              value={variantCount}
              onChange={(e) => setVariantCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={2}>2 (Control + 1 Variant)</option>
              <option value={3}>3 (Control + 2 Variants)</option>
              <option value={4}>4 (Control + 3 Variants)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Experiment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Variant Modal
function EditVariantModal({
  isOpen,
  onClose,
  experiment,
  siteId,
  siteDomain,
}: {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment | null;
  siteId: string;
  siteDomain?: string;
}) {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [editorUrl, setEditorUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (experiment?.variants?.length) {
      setSelectedVariant(experiment.variants[0].id || 'variant_0');
    }
  }, [experiment]);

  const generateUrl = async () => {
    if (!experiment || !selectedVariant) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/experiments/editor-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentId: experiment.id,
          siteId: siteId,
          variantId: selectedVariant,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setEditorUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to generate URL:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(editorUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !experiment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <PencilSquareIcon className="w-5 h-5 text-blue-600" />
          Edit Variant Visually
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Select a variant to edit, then open the editor on your live site.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Variant
            </label>
            <select
              value={selectedVariant}
              onChange={(e) => {
                setSelectedVariant(e.target.value);
                setEditorUrl('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {experiment.variants.map((v, i) => (
                <option key={v.id || i} value={v.id || `variant_${i}`}>
                  {v.name} ({v.weight}% traffic)
                </option>
              ))}
            </select>
          </div>

          {!editorUrl ? (
            <button
              onClick={generateUrl}
              disabled={isGenerating}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Editor URL'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-100 p-3 rounded-md">
                <div className="text-xs text-gray-500 mb-1">Editor URL (expires in 1 hour)</div>
                <div className="text-sm font-mono text-gray-800 break-all">
                  {editorUrl.slice(0, 60)}...
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={copyUrl}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
                <a
                  href={editorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Open Editor
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => {
              onClose();
              setEditorUrl('');
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Results panel
function ResultsPanel({ results }: { results: ExperimentResults | null }) {
  if (!results) {
    return (
      <div className="text-center text-gray-500 py-8">
        Select an experiment to view results
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {results.total_users.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Users</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {results.confidence_level || 0}%
          </div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div
            className={`text-2xl font-bold ${results.lift_percentage && results.lift_percentage > 0 ? "text-green-600" : "text-red-600"}`}
          >
            {results.lift_percentage ? `${results.lift_percentage > 0 ? "+" : ""}${results.lift_percentage.toFixed(1)}%` : "N/A"}
          </div>
          <div className="text-xs text-gray-500">Lift</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Statistical Confidence</span>
          <span>{results.confidence_level || 0}%</span>
        </div>
        <ConfidenceBar level={results.confidence_level || 0} />
        <div className="text-xs text-gray-400 mt-1">
          {results.is_significant
            ? "✅ Statistically significant"
            : "⏳ More data needed"}
        </div>
      </div>

      {/* Variant breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Variant Performance</h4>
        {results.variants.map((v) => (
          <div
            key={v.variant_id}
            className={`flex items-center justify-between p-3 rounded-lg border ${v.variant_id === results.winner ? "border-green-500 bg-green-50" : "border-gray-200"}`}
          >
            <div className="flex items-center gap-2">
              {v.variant_id === results.winner && (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium">{v.variant_name}</span>
            </div>
            <div className="text-right">
              <div className="font-bold">{v.conversion_rate.toFixed(2)}%</div>
              <div className="text-xs text-gray-500">
                {v.conversions}/{v.users} users
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status message */}
      {results.status_message && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          {results.status_message}
        </div>
      )}
    </div>
  );
}

// Main page component
export default function ExperimentsPage() {
  const { selectedSiteId, getSiteById } = useSite();
  const selectedSite = selectedSiteId ? getSiteById(selectedSiteId) : null;
  const searchParams = useSearchParams();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] =
    useState<Experiment | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch experiments
  const fetchExperiments = useCallback(async () => {
    if (!selectedSite?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/experiments?siteId=${selectedSite.id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch experiments");
      }

      setExperiments(data.experiments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id]);

  // Fetch results for selected experiment
  const fetchResults = useCallback(async (experimentId: string) => {
    if (!selectedSite?.id) return;

    setIsLoadingResults(true);

    try {
      const res = await fetch(
        `/api/experiments/results?siteId=${selectedSite.id}&experimentId=${experimentId}`
      );
      const data = await res.json();

      if (res.ok) {
        setResults(data.results);
      }
    } catch (err) {
      console.error("Failed to fetch results:", err);
    } finally {
      setIsLoadingResults(false);
    }
  }, [selectedSite?.id]);

  // Initial load
  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  // Load results when experiment selected
  useEffect(() => {
    if (selectedExperiment) {
      fetchResults(selectedExperiment.id);
    } else {
      setResults(null);
    }
  }, [selectedExperiment, fetchResults]);

  // Create experiment handler
  const handleCreateExperiment = async (data: {
    name: string;
    description: string;
    goalEvent: string;
    variantCount: number;
  }) => {
    if (!selectedSite?.id) return;

    try {
      const variants = Array.from({ length: data.variantCount }, (_, i) => ({
        name: i === 0 ? "control" : `variant_${String.fromCharCode(97 + i - 1)}`,
        weight: Math.floor(100 / data.variantCount),
      }));

      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite.id,
          name: data.name,
          description: data.description,
          goal_event: data.goalEvent,
          variants,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchExperiments();
      }
    } catch (err) {
      console.error("Failed to create experiment:", err);
    }
  };

  // Update experiment status
  const updateStatus = async (
    experimentId: string,
    newStatus: Experiment["status"]
  ) => {
    if (!selectedSite?.id) return;

    try {
      const res = await fetch(`/api/experiments/${experimentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        fetchExperiments();
      }
    } catch (err) {
      console.error("Failed to update experiment:", err);
    }
  };

  // No site selected
  if (!selectedSite) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please select a site to view experiments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BeakerIcon className="w-7 h-7 text-blue-600" />
            A/B Experiments
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and analyze experiments to optimize conversions
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-5 h-5" />
          New Experiment
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experiments list */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : experiments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <BeakerIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No experiments yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first A/B test to start optimizing
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5" />
                Create Experiment
              </button>
            </div>
          ) : (
            experiments.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExperiment(exp)}
                className={`p-4 bg-white rounded-lg border cursor-pointer transition hover:shadow-md ${selectedExperiment?.id === exp.id ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{exp.name}</h3>
                  <StatusBadge status={exp.status} />
                </div>

                {exp.description && (
                  <p className="text-sm text-gray-500 mb-3">{exp.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {exp.variants.length} variants • {exp.traffic_percentage}%
                    traffic
                  </div>

                  <div className="flex items-center gap-2">
                    {exp.status === "draft" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(exp.id, "running");
                        }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Start experiment"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    )}
                    {exp.status === "running" && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(exp.id, "paused");
                          }}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Pause experiment"
                        >
                          <PauseIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(exp.id, "completed");
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Complete experiment"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {exp.status === "paused" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(exp.id, "running");
                        }}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Resume experiment"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                    )}
                    {/* Edit Variant button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExperiment(exp);
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                      title="Edit variants visually"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <ChartBarIcon className="w-5 h-5 text-gray-500" />
            <h2 className="font-medium text-gray-900">Results</h2>
          </div>

          {isLoadingResults ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <ResultsPanel results={results} />
          )}
        </div>
      </div>

      {/* Create modal */}
      <CreateExperimentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateExperiment}
      />

      {/* Edit Variant modal */}
      <EditVariantModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingExperiment(null);
        }}
        experiment={editingExperiment}
        siteId={selectedSite?.id || ''}
        siteDomain={selectedSite?.domain}
      />
    </div>
  );
}
