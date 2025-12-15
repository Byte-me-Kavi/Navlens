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
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import { GoalConfig } from "@/features/experiments/components/GoalConfig";
import type { ExperimentGoal, GoalResults } from "@/lib/experiments/types";

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
  modifications?: Array<{ id: string; selector: string; type: string; changes?: Record<string, unknown> }>;
  traffic_percentage: number;
  goal_event?: string;
  goals?: ExperimentGoal[];  // Enterprise goal configurations
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
  goals?: GoalResults[];
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
    goals: ExperimentGoal[];
    variantCount: number;
    variantNames: string[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<ExperimentGoal[]>([]);
  const [variantCount, setVariantCount] = useState(2);
  const [variantNames, setVariantNames] = useState<string[]>(["Control", "Variant A"]);

  // Update variant names array when count changes
  const handleVariantCountChange = (count: number) => {
    setVariantCount(count);
    const defaultNames = ["Control", "Variant A", "Variant B", "Variant C"];
    setVariantNames(defaultNames.slice(0, count));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, goals, variantCount, variantNames });
    setName("");
    setDescription("");
    setGoals([]);
    setVariantCount(2);
    setVariantNames(["Control", "Variant A"]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
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

          {/* Enterprise Goal Configuration */}
          <div className="border-t border-gray-200 pt-4">
            <GoalConfig goals={goals} onChange={setGoals} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Variants
            </label>
            <select
              value={variantCount}
              onChange={(e) => handleVariantCountChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={2}>2 (Control + 1 Variant)</option>
              <option value={3}>3 (Control + 2 Variants)</option>
              <option value={4}>4 (Control + 3 Variants)</option>
            </select>
          </div>

          {/* Variant Names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variant Names
            </label>
            <div className="space-y-2">
              {variantNames.map((vName, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${idx === 0 ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                    {idx === 0 ? '🔵 Control' : `🟢 Variant ${idx}`}
                  </span>
                  <input
                    type="text"
                    value={vName}
                    onChange={(e) => {
                      const newNames = [...variantNames];
                      newNames[idx] = e.target.value;
                      setVariantNames(newNames);
                    }}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={idx === 0 ? "e.g., Original" : `e.g., ${idx === 1 ? 'Blue Button' : 'Green Button'}`}
                  />
                </div>
              ))}
            </div>
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
      const res = await secureApi.experiments.editorUrl({
        experimentId: experiment.id,
        siteId: siteId,
        variantId: selectedVariant,
      });

      if (res) {
        setEditorUrl(res.url);
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

// Edit Settings Modal (traffic percentage)
function EditSettingsModal({
  isOpen,
  onClose,
  experiment,
  siteId,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment | null;
  siteId: string;
  onSave: () => void;
}) {
  const [trafficPercentage, setTrafficPercentage] = useState(100);
  const [variantWeights, setVariantWeights] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (experiment) {
      setTrafficPercentage(experiment.traffic_percentage);
      // Initialize variant weights
      const weights: Record<string, number> = {};
      experiment.variants.forEach((v, i) => {
        weights[v.id || `variant_${i}`] = v.weight;
      });
      setVariantWeights(weights);
    }
  }, [experiment]);

  const updateVariantWeight = (variantId: string, newWeight: number) => {
    const totalOthers = Object.entries(variantWeights)
      .filter(([id]) => id !== variantId)
      .reduce((sum, [, w]) => sum + w, 0);
    
    // Ensure weights sum to 100
    const clampedWeight = Math.min(100 - totalOthers, Math.max(0, newWeight));
    setVariantWeights({ ...variantWeights, [variantId]: clampedWeight });
  };

  const handleSave = async () => {
    if (!experiment) return;
    
    setIsSaving(true);
    try {
      // Build updated variants array with new weights
      const updatedVariants = experiment.variants.map((v, i) => ({
        ...v,
        weight: variantWeights[v.id || `variant_${i}`] || v.weight,
      }));

      await secureApi.experiments.update(experiment.id, {
        siteId: siteId,
        traffic_percentage: trafficPercentage,
        variants: updatedVariants,
      });

      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !experiment) return null;

  const totalWeight = Object.values(variantWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">Edit Experiment Settings</h2>
        
        <div className="space-y-6">
          {/* Traffic Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Traffic Percentage: {trafficPercentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={trafficPercentage}
              onChange={(e) => setTrafficPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              {trafficPercentage}% of visitors will be in the experiment.
            </p>
          </div>

          {/* Variant Weights */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variant Distribution {totalWeight !== 100 && <span className="text-red-500">(must = 100%)</span>}
            </label>
            <div className="space-y-3">
              {experiment.variants.map((v, i) => {
                const variantId = v.id || `variant_${i}`;
                const weight = variantWeights[variantId] || 0;
                return (
                  <div key={variantId} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium truncate">{v.name}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weight}
                      onChange={(e) => updateVariantWeight(variantId, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <span className="w-12 text-right text-sm">{weight}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || totalWeight !== 100}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Experiment Modal - Full editing capabilities
function EditExperimentModal({
  isOpen,
  onClose,
  experiment,
  siteId,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment | null;
  siteId: string;
  onSave: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<ExperimentGoal[]>([]);
  const [variantNames, setVariantNames] = useState<string[]>([]);
  const [variantWeights, setVariantWeights] = useState<number[]>([]);
  const [trafficPercentage, setTrafficPercentage] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'goals' | 'variants'>('basic');

  // Load experiment data when opened
  useEffect(() => {
    if (experiment && isOpen) {
      setName(experiment.name);
      setDescription(experiment.description || "");
      setGoals(experiment.goals || []);
      setVariantNames(experiment.variants.map(v => v.name));
      setVariantWeights(experiment.variants.map(v => v.weight));
      setTrafficPercentage(experiment.traffic_percentage);
    }
  }, [experiment, isOpen]);

  if (!isOpen || !experiment) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build updated variants with new names and weights
      const updatedVariants = experiment.variants.map((v, i) => ({
        ...v,
        name: variantNames[i] || v.name,
        weight: variantWeights[i] || v.weight,
      }));

      await secureApi.experiments.update(experiment.id, {
        siteId: siteId,
        name,
        description,
        goals,
        variants: updatedVariants,
        traffic_percentage: trafficPercentage,
      });

      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to update experiment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const tabClasses = (tab: string) => 
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      activeTab === tab 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Edit Experiment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button className={tabClasses('basic')} onClick={() => setActiveTab('basic')}>
            📝 Basic Info
          </button>
          <button className={tabClasses('goals')} onClick={() => setActiveTab('goals')}>
            🎯 Goals
          </button>
          <button className={tabClasses('variants')} onClick={() => setActiveTab('variants')}>
            🧪 Variants & Traffic
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experiment Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Configure what you want to track as conversions. You can remove existing goals or add new ones.
              </p>
              <GoalConfig goals={goals} onChange={setGoals} />
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-6">
              {/* Variant Names & Weights */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variant Names & Traffic Split
                  <span className="text-xs text-gray-400 ml-2">
                    (Total: {variantWeights.reduce((a, b) => a + b, 0)}%)
                  </span>
                </label>
                <div className="space-y-3">
                  {variantNames.map((vName, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${idx === 0 ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                        {idx === 0 ? '🔵 Control' : `🟢 V${idx}`}
                      </span>
                      <input
                        type="text"
                        value={vName}
                        onChange={(e) => {
                          const newNames = [...variantNames];
                          newNames[idx] = e.target.value;
                          setVariantNames(newNames);
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Variant name"
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={variantWeights[idx] || 0}
                        onChange={(e) => {
                          const newWeights = [...variantWeights];
                          newWeights[idx] = parseInt(e.target.value);
                          setVariantWeights(newWeights);
                        }}
                        className="w-20 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                      />
                      <span className="w-10 text-right text-sm font-medium text-gray-700">
                        {variantWeights[idx] || 0}%
                      </span>
                    </div>
                  ))}
                </div>
                {variantWeights.reduce((a, b) => a + b, 0) !== 100 && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Weights should sum to 100% (currently {variantWeights.reduce((a, b) => a + b, 0)}%)
                  </p>
                )}
              </div>

              {/* Traffic Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Traffic Percentage: {trafficPercentage}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={trafficPercentage}
                  onChange={(e) => setTrafficPercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of eligible visitors that enter the experiment
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal - Pretty warning popup
function DeleteConfirmModal({
  isOpen,
  onClose,
  experiment,
  siteId,
  onDeleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment | null;
  siteId: string;
  onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!isOpen || !experiment) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await secureApi.experiments.delete(experiment.id, siteId);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Failed to delete experiment:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Warning Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <TrashIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Delete Experiment?</h2>
              <p className="text-sm text-red-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800 mb-2">⚠️ Warning: All data will be lost!</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• All visitor assignments will be removed</li>
              <li>• All conversion data will be deleted</li>
              <li>• Visual modifications will be deactivated</li>
              <li>• Statistical results will be permanently lost</li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              You are about to delete: <strong className="text-gray-900">{experiment.name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Type <strong className="text-red-600">delete</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type 'delete' to confirm"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : '🗑️ Delete Forever'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Results panel
function ResultsPanel({ results, experiment }: { results: ExperimentResults | null; experiment: Experiment | null }) {
  if (!results) {
    return (
      <div className="text-center text-gray-500 py-8">
        Select an experiment to view results
      </div>
    );
  }

  // Goal type icons/labels
  const goalTypeLabels: Record<string, string> = {
    'click': '🖱️ Click',
    'pageview': '📄 Page View',
    'form_submit': '📝 Form Submit',
    'custom_event': '⚡ Event',
    'scroll_depth': '📜 Scroll',
    'time_on_page': '⏱️ Time',
    'revenue': '💰 Revenue',
  };

  // Helper to get friendly goal description
  const getGoalDescription = (goal: ExperimentGoal) => {
    switch (goal.type) {
      case 'click':
        return goal.selector ? `Element: ${goal.selector}` : 'Any click';
      case 'pageview':
        return `URL: ${goal.url_pattern || '/'}` + (goal.url_match ? ` (${goal.url_match})` : '');
      case 'form_submit':
        return goal.selector ? `Form: ${goal.selector}` : 'Any form submission';
      case 'custom_event':
        return `Event: ${goal.event_name || 'conversion'}`;
      case 'scroll_depth':
        return `Scroll to ${goal.depth_percentage || 50}%`;
      case 'time_on_page':
        return `Stay ${goal.seconds || 30} seconds`;
      case 'revenue':
        return `Track ${goal.event_name || 'purchase'} revenue`;
      default:
        return goal.name;
    }
  };

  return (
    <div className="space-y-4">
      {/* Configured Goals Section */}
      {experiment?.goals && experiment.goals.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <h4 className="text-sm font-medium text-purple-900 mb-2">🎯 Tracking Goals</h4>
          <div className="space-y-1.5">
            {experiment.goals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{goalTypeLabels[goal.type] || goal.type}</span>
                  <span className="text-purple-700 font-medium">{goal.name}</span>
                  {goal.is_primary && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Primary</span>
                  )}
                </div>
                <span className="text-purple-600 text-xs">{getGoalDescription(goal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy goal_event display */}
      {!experiment?.goals?.length && experiment?.goal_event && (
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <h4 className="text-sm font-medium text-purple-900 mb-1">🎯 Tracking Goal</h4>
          <span className="text-sm text-purple-700">Event: {experiment.goal_event}</span>
        </div>
      )}

      {/* Key Metrics Summary - More User Friendly */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">
            {results.total_users.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600">Visitors in Test</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
          <div className="text-2xl font-bold text-green-700">
            {results.variants.reduce((sum, v) => sum + v.conversions, 0).toLocaleString()}
          </div>
          <div className="text-xs text-green-600">Goal Conversions</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-700">
            {results.confidence_level || 0}%
          </div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
          <div
            className={`text-2xl font-bold ${
              (results.lift_percentage || 0) > 0 ? "text-green-600" : 
              (results.lift_percentage || 0) < 0 ? "text-red-600" : "text-gray-700"
            }`}
          >
            {typeof results.lift_percentage === 'number' 
              ? `${results.lift_percentage > 0 ? "+" : ""}${results.lift_percentage.toFixed(1)}%` 
              : "—"}
          </div>
          <div className="text-xs text-gray-500">Improvement</div>
        </div>
      </div>

      {/* Results Explanation */}
      <div className={`p-3 rounded-lg text-sm ${
        results.is_significant 
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-amber-50 border border-amber-200 text-amber-800'
      }`}>
        {results.is_significant ? (
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span><strong>Statistically significant!</strong> {results.winner ? `"${results.variants.find(v => v.variant_id === results.winner)?.variant_name}" is the winner.` : 'You can make decisions based on these results.'}</span>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowPathIcon className="w-5 h-5 text-amber-600" />
              <strong>Collecting more data...</strong>
            </div>
            <p className="text-xs text-amber-700">
              {results.total_users < 100 
                ? `Need ${100 - results.total_users} more visitors for reliable results.`
                : (results.confidence_level || 0) < 95 
                  ? `Confidence is ${results.confidence_level || 0}%. Need 95%+ for statistical significance.`
                  : 'Almost there! Keep the test running for more accurate results.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Variant Performance - User Friendly */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-800">📊 Performance by Variant</h4>
        {results.variants.map((v, idx) => {
          const isWinner = v.variant_id === results.winner;
          const isControl = idx === 0;
          const conversionRate = v.users > 0 ? (v.conversions / v.users) * 100 : 0;
          const maxRate = Math.max(...results.variants.map(x => x.users > 0 ? (x.conversions / x.users) * 100 : 0), 1);
          
          return (
            <div
              key={v.variant_id}
              className={`p-4 rounded-lg border-2 ${
                isWinner ? "border-green-500 bg-green-50" : 
                isControl ? "border-gray-300 bg-gray-50" : 
                "border-blue-200 bg-blue-50"
              }`}
            >
              {/* Variant Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isWinner && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    isControl ? 'bg-gray-200 text-gray-700' : 'bg-blue-200 text-blue-700'
                  }`}>
                    {isControl ? '🔵 Control' : `🟢 Variant`}
                  </span>
                  <span className="font-semibold text-gray-900">{v.variant_name}</span>
                  {isWinner && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">Winner!</span>}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">conversion rate</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-gray-200 rounded-full mb-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    isWinner ? 'bg-green-500' : isControl ? 'bg-gray-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (conversionRate / maxRate) * 100)}%` }}
                />
              </div>

              {/* Stats Row */}
              <div className="flex justify-between text-sm text-gray-600">
                <span>👥 <strong>{v.users.toLocaleString()}</strong> visitors</span>
                <span>🎯 <strong>{v.conversions.toLocaleString()}</strong> goals reached</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      {results.status_message && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
          💡 {results.status_message}
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditExperimentModal, setShowEditExperimentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch experiments using secure API
  const fetchExperiments = useCallback(async () => {
    if (!selectedSite?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // SECURITY: Uses POST with encrypted response
      const data = await secureApi.experiments.list(selectedSite.id);
      setExperiments((data.experiments as Experiment[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSite?.id]);

  // Fetch results using secure API
  const fetchResults = useCallback(async (experimentId: string) => {
    if (!selectedSite?.id) return;

    setIsLoadingResults(true);

    try {
      // SECURITY: Uses POST with encrypted response
      const data = await secureApi.experiments.results(selectedSite.id, experimentId);
      setResults((data as { results: ExperimentResults }).results);
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
    goals: ExperimentGoal[];
    variantCount: number;
    variantNames: string[];
  }) => {
    if (!selectedSite?.id) return;

    try {
      // Use custom variant names from form
      const variants = data.variantNames.map((variantName, i) => ({
        name: variantName || (i === 0 ? "Control" : `Variant ${String.fromCharCode(64 + i)}`),
        weight: Math.floor(100 / data.variantCount),
      }));

      await secureApi.experiments.create({
        siteId: selectedSite.id,
        name: data.name,
        description: data.description,
        goals: data.goals,
        // Backward compat: also set goal_event from primary goal
        goal_event: data.goals.find(g => g.is_primary)?.event_name || 
                    data.goals[0]?.event_name || 
                    'conversion',
        variants,
      });

      setShowCreateModal(false);
      fetchExperiments();
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
      await secureApi.experiments.update(experimentId, {
        siteId: selectedSite.id,
        status: newStatus,
      });

      fetchExperiments();
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
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{exp.variants.length} variants</span>
                    <span>•</span>
                    <span>{exp.traffic_percentage}% traffic</span>
                    {exp.modifications && exp.modifications.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                          {exp.modifications.length} changes
                        </span>
                      </>
                    )}
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
                    {/* Edit Experiment button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExperiment(exp);
                        setShowEditExperimentModal(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit experiment settings"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExperiment(exp);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Delete experiment"
                    >
                      <TrashIcon className="w-4 h-4" />
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
            <ResultsPanel results={results} experiment={selectedExperiment} />
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

      {/* Edit Settings modal */}
      <EditSettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setEditingExperiment(null);
        }}
        experiment={editingExperiment}
        siteId={selectedSite?.id || ''}
        onSave={fetchExperiments}
      />

      {/* Edit Experiment Modal */}
      <EditExperimentModal
        isOpen={showEditExperimentModal}
        onClose={() => {
          setShowEditExperimentModal(false);
          setEditingExperiment(null);
        }}
        experiment={editingExperiment}
        siteId={selectedSite?.id || ''}
        onSave={() => {
          fetchExperiments();
          // Also refresh results if editing the selected experiment
          if (editingExperiment && editingExperiment.id === selectedExperiment?.id) {
            fetchResults(editingExperiment.id);
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEditingExperiment(null);
        }}
        experiment={editingExperiment}
        siteId={selectedSite?.id || ''}
        onDeleted={() => {
          fetchExperiments();
          setSelectedExperiment(null);
        }}
      />
    </div>
  );
}
