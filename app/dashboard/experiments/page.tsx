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
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  StopIcon,
  ClockIcon,
  CurrencyDollarIcon,
  QueueListIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { useSite } from "@/app/context/SiteContext";
import { secureApi } from "@/lib/secureApi";
import { GoalConfig } from "@/features/experiments/components/GoalConfig";
import type { ExperimentGoal, GoalResults } from "@/lib/experiments/types";
import { useAI } from "@/context/AIProvider";
import { FeatureLock } from '@/components/subscription/FeatureLock';
import { useSubscription } from '@/app/context/SubscriptionContext';
import LoadingSpinner from '@/components/LoadingSpinner';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <BeakerIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Experiment</h2>
              <p className="text-sm text-gray-500">Set up an A/B test to optimize your conversions</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Experiment Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium"
              placeholder="e.g., Homepage CTA Color Test"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
              placeholder="What are you testing?"
              rows={2}
            />
          </div>

          {/* Enterprise Goal Configuration */}
          <div className="border-t border-gray-100 pt-5">
            <GoalConfig goals={goals} onChange={setGoals} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Number of Variants
              </label>
              <select
                value={variantCount}
                onChange={(e) => handleVariantCountChange(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer bg-white"
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
              <div className="space-y-2.5">
                {variantNames.map((vName, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${idx === 0 ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {idx === 0 ? <div className="w-1.5 h-1.5 rounded-full bg-gray-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      {idx === 0 ? 'Control' : `Variant ${idx}`}
                    </span>
                    <input
                      type="text"
                      value={vName}
                      onChange={(e) => {
                        const newNames = [...variantNames];
                        newNames[idx] = e.target.value;
                        setVariantNames(newNames);
                      }}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder={idx === 0 ? "e.g., Original" : `e.g., ${idx === 1 ? 'Blue Button' : 'Green Button'}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 font-medium transition-all"
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
          <PencilSquareIcon className="w-5 h-5 text-indigo-600" />
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
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium transition-all shadow-sm shadow-indigo-200"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold mb-6 text-gray-900">Edit Experiment Settings</h2>
        
        <div className="space-y-8">
          {/* Traffic Percentage */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <label className="text-sm font-semibold text-gray-900">Traffic Allocation</label>
               <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                 {trafficPercentage}%
               </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="100"
              value={trafficPercentage}
              onChange={(e) => setTrafficPercentage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-lg cursor-pointer accent-indigo-600 appearance-none hover:bg-gray-200 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">
              Determines what percentage of total visitors will be included in this experiment.
            </p>
          </div>

          {/* Variant Weights */}
          <div>
            <div className="flex justify-between items-center mb-4">
               <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                 Variant Weights
                 {totalWeight !== 100 && (
                   <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                     <ExclamationTriangleIcon className="w-3 h-3" />
                     Must sum to 100%
                   </span>
                 )}
               </label>
               <span className={`text-sm font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-500'}`}>
                 Total: {totalWeight}%
               </span>
            </div>
            
            <div className="space-y-5">
              {experiment.variants.map((v, i) => {
                const variantId = v.id || `variant_${i}`;
                const weight = variantWeights[variantId] || 0;
                return (
                  <div key={variantId}>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-2">
                      <span>{v.name}</span>
                      <span>{weight}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weight}
                      onChange={(e) => updateVariantWeight(variantId, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-100 rounded-lg cursor-pointer accent-indigo-600 appearance-none hover:bg-gray-200 transition-colors"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || totalWeight !== 100}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 font-medium transition-all"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Experiment Modal - Full editing capabilities
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
    `px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2 ${
      activeTab === tab 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100 hover:border-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold text-gray-900">Edit Experiment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none transition-colors">&times;</button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-6 pb-2 bg-gray-50/50">
           <div className="flex gap-3 overflow-x-auto no-scrollbar">
              <button className={tabClasses('basic')} onClick={() => setActiveTab('basic')}>
                <DocumentTextIcon className="w-4 h-4" /> Basic Info
              </button>
              <button className={tabClasses('goals')} onClick={() => setActiveTab('goals')}>
                <ArrowTrendingUpIcon className="w-4 h-4" /> Goals
              </button>
              <button className={tabClasses('variants')} onClick={() => setActiveTab('variants')}>
                <BeakerIcon className="w-4 h-4" /> Variants & Traffic
              </button>
           </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 flex-1 overflow-y-auto bg-white">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Experiment Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  rows={3}
                />
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-50">
                  <p className="text-sm text-indigo-900 flex items-start gap-2">
                    <InformationCircleIcon className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    Configure what you want to track as conversions. You can add multiple goals to track different user actions.
                  </p>
              </div>
              <GoalConfig goals={goals} onChange={setGoals} />
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-8">
              {/* Variant Names & Weights */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Variant Names & Traffic Split
                  <span className="text-xs text-gray-400 ml-2 font-normal">
                    (Total: {variantWeights.reduce((a, b) => a + b, 0)}%)
                  </span>
                </label>
                <div className="space-y-3">
                  {variantNames.map((vName, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                      <div className="w-32 flex-shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5 ${idx === 0 ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {idx === 0 ? <div className="w-1.5 h-1.5 rounded-full bg-gray-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                            {idx === 0 ? 'Control' : `Variant ${idx}`}
                          </span>
                      </div>
                      
                      <div className="flex-1">
                          <input
                            type="text"
                            value={vName}
                            onChange={(e) => {
                              const newNames = [...variantNames];
                              newNames[idx] = e.target.value;
                              setVariantNames(newNames);
                            }}
                            className="w-full px-3 py-1.5 text-sm border-b border-gray-200 focus:border-indigo-500 outline-none transition-colors placeholder:text-gray-400 bg-transparent"
                            placeholder="Variant name"
                          />
                      </div>

                      <div className="flex items-center gap-3 w-48">
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
                            className="flex-1 h-1.5 bg-gray-100 rounded-lg cursor-pointer accent-indigo-600 appearance-none hover:bg-gray-200 transition-colors"
                          />
                          <span className="w-10 text-right text-sm font-bold text-gray-700">
                            {variantWeights[idx] || 0}%
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
                {variantWeights.reduce((a, b) => a + b, 0) !== 100 && (
                  <p className="text-xs text-red-600 mt-3 flex items-center gap-1.5 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Weights must sum to exactly 100% (currently {variantWeights.reduce((a, b) => a + b, 0)}%)
                  </p>
                )}
              </div>

              {/* Traffic Percentage */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                   <label className="text-sm font-medium text-gray-700">Traffic Allocation</label>
                   <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                     {trafficPercentage}%
                   </span>
                </div>
                
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={trafficPercentage}
                  onChange={(e) => setTrafficPercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg cursor-pointer accent-indigo-600 appearance-none hover:bg-gray-200 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">
                   Percentage of eligible visitors that will be included in this experiment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 font-medium transition-all"
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
            <h3 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              Warning: All data will be lost!
            </h3>
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
            {isDeleting ? 'Deleting...' : <><TrashIcon className="w-4 h-4" /> Delete Forever</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// Results panel
function ResultsPanel({ results, experiment }: { results: ExperimentResults | null; experiment: Experiment | null }) {
  if (!results || !experiment) return null;

  // Icons mapping for goals
  const GoalIcon = ({ type }: { type: string }) => {
    switch(type) {
      case 'click': return <CursorArrowRaysIcon className="w-4 h-4 text-indigo-500" />;
      case 'pageview': return <DocumentTextIcon className="w-4 h-4 text-purple-500" />;
      case 'form_submit': return <QueueListIcon className="w-4 h-4 text-blue-500" />;
      case 'revenue': return <CurrencyDollarIcon className="w-4 h-4 text-green-500" />;
      default: return <ArrowTrendingUpIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  // Prepare chart data
  const chartData = results.variants.map(v => ({
    name: v.variant_name,
    rate: v.users > 0 ? (v.conversions / v.users) * 100 : 0,
    conversions: v.conversions,
    users: v.users,
    isWinner: v.variant_id === results.winner,
    isControl: v.variant_name.toLowerCase().includes('control')
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <UsersIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Visitors</span>
           </div>
           <div className="text-2xl font-bold text-gray-900">{results.total_users.toLocaleString()}</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Conversions</span>
           </div>
           <div className="text-2xl font-bold text-gray-900">
             {results.variants.reduce((acc, v) => acc + v.conversions, 0).toLocaleString()}
           </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Confidence</span>
           </div>
           <div className="text-2xl font-bold text-gray-900">{results.confidence_level || 0}%</div>
           <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  (results.confidence_level || 0) >= 95 ? 'bg-emerald-500' : 'bg-amber-500'
                }`} 
                style={{ width: `${results.confidence_level || 0}%` }} 
              />
           </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <ArrowUpIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Lift</span>
           </div>
           <div className={`text-2xl font-bold ${(results.lift_percentage || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {(results.lift_percentage || 0) > 0 ? '+' : ''}{(results.lift_percentage || 0).toFixed(1)}%
           </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
         <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
               <InformationCircleIcon className="w-5 h-5 text-indigo-600" />
            </div>
            Configured Goals
         </h4>
         <div className="space-y-2">
            {experiment.goals?.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <GoalIcon type={goal.type} />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 block mb-0.5">{goal.name}</span>
                        <div className="flex items-center gap-2">
                            {goal.is_primary && <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Primary</span>}
                            <span className="text-gray-500 text-xs font-mono">
                                {goal.selector || goal.url_pattern || goal.event_name || 'Global'}
                            </span>
                        </div>
                      </div>
                   </div>
                </div>
            ))}
         </div>
      </div>

      {/* Chart Section with Variant Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-gray-600" />
                </div>
                Conversion Rate Comparison
            </h3>
            {results.winner && (
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <SparklesIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                        Winner: <span className="font-bold">{results.variants.find(v => v.variant_id === results.winner)?.variant_name}</span>
                    </span>
                </div>
            )}
        </div>

        {/* Main Content: Chart + Variant Details side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Chart */}
          <div className="lg:col-span-2 p-5 border-r border-gray-100">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis type="number" unit="%" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{fill: '#374151', fontSize: 13, fontWeight: 600}} 
                  />
                  <Tooltip 
                    cursor={{fill: '#F3F4F6'}}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Conversion Rate']}
                  />
                  <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={32}>
                    {chartData.map((entry, index) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                      const baseColor = colors[index % colors.length];
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isWinner ? '#10B981' : baseColor}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Variant Details */}
          <div className="p-5 bg-gray-50 space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Variant Details</h4>
            {results.variants.map((variant, index) => {
              const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-violet-500'];
              const colorClass = colors[index % colors.length];
              
              return (
                <div key={variant.variant_id} className="bg-white p-3 rounded-lg border border-gray-200 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorClass}`} />
                  <div className="pl-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">{variant.variant_name}</span>
                      {results.winner === variant.variant_id && (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Winner</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xl font-bold ${results.winner === variant.variant_id ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {variant.conversion_rate.toFixed(1)}%
                      </span>
                      <div className="text-right text-xs text-gray-500">
                        <div>{variant.users.toLocaleString()} visitors</div>
                        <div>{variant.conversions.toLocaleString()} conversions</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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
    <FeatureLock 
      feature="ab_testing" 
      title="Unlock A/B Testing"
      description="Run A/B tests to optimize your site's conversion rate."
    >
      <div className="w-full px-4 sm:px-3 lg:px-2 py-2">
       <div className="max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">A/B Experiments</h1>
                <p className="text-gray-500 mt-2 text-lg">Create and analyze experiments to optimize conversions.</p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-sm hover:shadow-md h-fit"
            >
              <PlusIcon className="w-5 h-5" />
              New Experiment
            </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        {/* Main content - Stacked Layout */}
        <div className="space-y-8">
          {/* Experiments Selection Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Your Experiments
            </h2>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner fullScreen={false} />
              </div>
            ) : experiments.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm border-dashed">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BeakerIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No experiments yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start your first A/B test to optimize your website's conversion rate.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium shadow-sm shadow-indigo-200"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create Experiment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {experiments.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExperiment(exp)}
                    className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedExperiment?.id === exp.id 
                      ? "bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-lg" 
                      : "bg-white border-white hover:border-indigo-300 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold truncate text-sm ${selectedExperiment?.id === exp.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                        {exp.name}
                      </h3>
                      <StatusBadge status={exp.status} />
                    </div>

                    {/* Description */}
                    {exp.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mb-3">{exp.description}</p>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1.5">
                        <BeakerIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium text-gray-700">{exp.variants.length}</span> variants
                      </span>
                      <span className="flex items-center gap-1.5">
                        <UsersIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium text-gray-700">{exp.traffic_percentage}%</span>
                      </span>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        {/* Start/Pause/Resume Buttons */}
                        {exp.status === "draft" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(exp.id, "running");
                            }}
                            className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
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
                              className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                              title="Pause experiment"
                            >
                              <PauseIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(exp.id, "completed");
                              }}
                              className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
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
                            className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                            title="Resume experiment"
                          >
                            <PlayIcon className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingExperiment(exp);
                            setShowEditExperimentModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Settings"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingExperiment(exp);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingExperiment(exp);
                          setShowEditModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-xs font-medium transition-colors"
                      >
                        <PencilSquareIcon className="w-3 h-3" />
                        Edit Variant
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Experiment Results
            </h2>
            <div className="min-h-[300px]">
              {isLoadingResults ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <LoadingSpinner fullScreen={false} />
                </div>
              ) : selectedExperiment ? (
                <>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                          <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                           <h2 className="font-bold text-lg text-gray-900">{selectedExperiment.name}</h2>
                           <p className="text-xs text-gray-500">Last updated: just now</p>
                      </div>
                     
                      <div className="flex items-center gap-2">
                          <StatusBadge status={selectedExperiment.status} />
                      </div>
                  </div>
                  <ResultsPanel results={results} experiment={selectedExperiment} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center rounded-xl border border-gray-200 border-dashed bg-gray-50/50">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
                        <ChartBarIcon className="w-8 h-8 text-gray-400" />
                   </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Select an experiment</h3>
                  <p className="text-gray-500 max-w-sm">
                    Choose an experiment from above to view detailed performance metrics.
                  </p>
                </div>
              )}
            </div>
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
      </div>
    </FeatureLock>
  );
}
