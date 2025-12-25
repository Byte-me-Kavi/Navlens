"use client";

import React, { useEffect, useState } from "react";
import { secureApi } from "@/lib/secureApi";
import { 
    BeakerIcon,
    CheckCircleIcon,
    PlayIcon,
    PauseIcon,
    ChartBarIcon,
    TrophyIcon
} from "@heroicons/react/24/outline";

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
  is_significant: boolean;
}

const StatusBadge = ({ status }: { status: Experiment["status"] }) => {
  const config = {
    draft: { bg: "bg-gray-100", text: "text-gray-600", icon: BeakerIcon },
    running: { bg: "bg-green-100", text: "text-green-700", icon: PlayIcon },
    paused: { bg: "bg-amber-100", text: "text-amber-700", icon: PauseIcon },
    completed: { bg: "bg-indigo-100", text: "text-indigo-700", icon: CheckCircleIcon },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

function ExperimentResultsCard({ experiment, siteId, days }: { experiment: Experiment; siteId: string; days: number }) {
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!siteId || !experiment?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setError(null);
        // Calculate date range based on days prop
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const endDate = new Date().toISOString();
        
        console.log(`[ExperimentResults] Fetching for ${experiment.id}, site: ${siteId}`);
        
        const data = await secureApi.experiments.results(siteId, experiment.id, {
          startDate,
          endDate
        });
        
        console.log(`[ExperimentResults] Response:`, data);
        
        // @ts-ignore - API returns wrapped object
        const resultsData = (data as any)?.results || data as ExperimentResults;
        setResults(resultsData);
      } catch (err) {
        console.error("Failed to fetch experiment results:", err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [siteId, experiment?.id, days]);

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded-lg"></div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 italic p-4 bg-red-50 rounded-lg">
        Error loading results: {error}
      </div>
    );
  }

  if (!results || !results.variants || results.variants.length === 0) {
    // If results exist but variants are empty, show placeholder data from experiment
    if (experiment.variants && experiment.variants.length > 0) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {experiment.variants.map((variant) => (
              <div 
                key={variant.id} 
                className="p-4 rounded-xl border bg-gray-50 border-gray-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-900">{variant.name}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">0.00%</div>
                <div className="text-xs text-gray-500">0 / 0 users</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 text-center italic">
            No conversion data recorded yet for this experiment.
          </div>
        </div>
      );
    }
    return (
      <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg">
        No results data available yet.
      </div>
    );
  }

  const winningVariant = results.variants.reduce((a, b) => 
    a.conversion_rate > b.conversion_rate ? a : b
  );

  return (
    <div className="space-y-4">
      {/* Variants Comparison */}
      <div className="grid grid-cols-2 gap-3">
        {results.variants.map((variant) => {
          const isWinner = variant.variant_id === winningVariant.variant_id && results.is_significant;
          return (
            <div 
              key={variant.variant_id} 
              className={`p-4 rounded-xl border ${isWinner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-gray-900">{variant.variant_name}</span>
                {isWinner && <TrophyIcon className="w-4 h-4 text-green-600" />}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {variant.conversion_rate.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500">
                {variant.conversions.toLocaleString()} / {variant.users.toLocaleString()} users
              </div>
            </div>
          );
        })}
      </div>

      {/* Significance Indicator */}
      {results.is_significant && (
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
          <span className="text-indigo-700 font-medium text-sm">
            ✓ Statistically significant result
            {results.confidence_level && ` (${results.confidence_level}% confidence)`}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ReportExperimentsWrapper({ siteId, days }: { siteId: string; days: number }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperiments = async () => {
      if (!siteId) return;
      setLoading(true);
      try {
        const data = await secureApi.experiments.list(siteId);
        // @ts-ignore - API returns { experiments: [...] }
        const experimentsList = (data as any)?.experiments || data;
        // Filter to show running, paused, or recently completed
        const relevantExperiments = (experimentsList as Experiment[]).filter(
          (exp) => exp.status === "running" || exp.status === "paused" || exp.status === "completed"
        );
        setExperiments(relevantExperiments);
      } catch (error) {
        console.error("Failed to load experiments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExperiments();
  }, [siteId]);

  if (loading) return <div className="text-gray-500 text-center py-8">Loading Experiments...</div>;
  if (!experiments || experiments.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-center">
        <BeakerIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No Active Experiments</p>
        <p className="text-gray-500 text-sm mt-1">
          A/B tests allow you to compare design variants and measure conversion impact.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {experiments.slice(0, 3).map((experiment) => (
        <div 
          key={experiment.id} 
          className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm break-inside-avoid"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{experiment.name}</h3>
              {experiment.description && (
                <p className="text-sm text-gray-500 mt-1">{experiment.description}</p>
              )}
            </div>
            <StatusBadge status={experiment.status} />
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
            <span className="flex items-center gap-1">
              <ChartBarIcon className="w-4 h-4" />
              {experiment.traffic_percentage}% traffic
            </span>
            <span>
              {experiment.variants.length} variants
            </span>
            {experiment.started_at && (
              <span>
                Started {new Date(experiment.started_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Results */}
          <ExperimentResultsCard experiment={experiment} siteId={siteId} days={days} />
        </div>
      ))}
    </div>
  );
}
