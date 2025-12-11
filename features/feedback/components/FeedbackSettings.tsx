/**
 * FeedbackSettings Component
 * 
 * Dashboard UI for site owners to configure the feedback widget
 */

"use client";

import { useState, useEffect } from "react";
import { useSite } from "@/app/context/SiteContext";
import {
  FiMessageCircle,
  FiSave,
  FiRefreshCw,
  FiToggleLeft,
  FiToggleRight,
  FiClock,
  FiZap,
  FiLogOut,
} from "react-icons/fi";
import { DEFAULT_FEEDBACK_CONFIG, type FeedbackWidgetConfig } from "../types/feedback.types";

interface FeedbackSettingsProps {
  className?: string;
}

export function FeedbackSettings({ className = "" }: FeedbackSettingsProps) {
  const { selectedSiteId, sites } = useSite();
  const [config, setConfig] = useState<FeedbackWidgetConfig>(DEFAULT_FEEDBACK_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  // Load saved config
  useEffect(() => {
    if (!selectedSiteId) {
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        // Try to load from localStorage first (or API in production)
        const savedConfig = localStorage.getItem(`navlens_feedback_config_${selectedSiteId}`);
        if (savedConfig) {
          setConfig({ ...DEFAULT_FEEDBACK_CONFIG, ...JSON.parse(savedConfig) });
        }
      } catch (err) {
        console.error("Failed to load feedback config:", err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [selectedSiteId]);

  const handleSave = async () => {
    if (!selectedSiteId) return;

    setSaving(true);
    try {
      // Save to localStorage for immediate local use
      localStorage.setItem(`navlens_feedback_config_${selectedSiteId}`, JSON.stringify(config));
      
      // Save to database via API (for tracker.js to fetch)
      const response = await fetch('/api/feedback-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId, config }),
      });
      
      if (!response.ok) {
        console.warn('API save failed, config saved locally only');
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save feedback config:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof FeedbackWidgetConfig>(
    key: K,
    value: FeedbackWidgetConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (!selectedSiteId) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-8 text-center ${className}`}>
        <FiMessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Select a site to configure feedback widget</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <FiRefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-500">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
              <FiMessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Feedback Widget Settings</h3>
              <p className="text-sm text-gray-500">
                Configure for {selectedSite?.site_name || selectedSite?.domain}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              saved
                ? "bg-green-100 text-green-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {saving ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <FiSave className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="p-6 space-y-6">
        {/* Enable/Disable Widget */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <h4 className="font-semibold text-gray-900">Enable Feedback Widget</h4>
            <p className="text-sm text-gray-500">Show the floating feedback button on your site</p>
          </div>
          <button
            onClick={() => updateConfig("enabled", !config.enabled)}
            className={`p-2 rounded-lg transition-colors ${
              config.enabled ? "text-green-600" : "text-gray-400"
            }`}
          >
            {config.enabled ? (
              <FiToggleRight className="w-8 h-8" />
            ) : (
              <FiToggleLeft className="w-8 h-8" />
            )}
          </button>
        </div>

        {/* Position */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Widget Position</h4>
          <div className="grid grid-cols-2 gap-2">
            {(["bottom-right", "bottom-left", "top-right", "top-left"] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => updateConfig("position", pos)}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  config.position === pos
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {pos.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Widget Color</h4>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.primaryColor}
              onChange={(e) => updateConfig("primaryColor", e.target.value)}
              className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={config.primaryColor}
              onChange={(e) => updateConfig("primaryColor", e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg w-28 font-mono text-sm"
            />
          </div>
        </div>

        {/* Survey Triggers */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Survey Triggers</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <FiLogOut className="w-5 h-5 text-gray-500" />
                <div>
                  <span className="font-medium text-gray-700">Exit Intent Survey</span>
                  <p className="text-xs text-gray-500">Show survey when user is about to leave</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.showExitIntent}
                onChange={(e) => updateConfig("showExitIntent", e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <FiZap className="w-5 h-5 text-gray-500" />
                <div>
                  <span className="font-medium text-gray-700">Frustration Survey</span>
                  <p className="text-xs text-gray-500">Show survey when frustration detected</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.showFrustrationSurvey}
                onChange={(e) => updateConfig("showFrustrationSurvey", e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </label>
          </div>
        </div>

        {/* Timing */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">
            <FiClock className="w-4 h-4 inline mr-2" />
            Minimum Time Before Survey
          </h4>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={300}
              value={config.minTimeBeforeSurvey}
              onChange={(e) => updateConfig("minTimeBeforeSurvey", parseInt(e.target.value) || 0)}
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center"
            />
            <span className="text-gray-600">seconds</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Wait this long before showing any automatic survey
          </p>
        </div>

        {/* Allow Dismiss */}
        <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
          <div>
            <h4 className="font-semibold text-gray-900">Allow "Don&apos;t Ask Again"</h4>
            <p className="text-sm text-gray-500">Users can permanently dismiss the widget</p>
          </div>
          <input
            type="checkbox"
            checked={config.allowDismiss}
            onChange={(e) => updateConfig("allowDismiss", e.target.checked)}
            className="w-5 h-5 rounded text-blue-600"
          />
        </label>
      </div>

      {/* Preview */}
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-3">Preview</h4>
        <div className="relative h-32 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div
            className={`absolute p-3 rounded-full shadow-lg ${
              config.position.includes("bottom") ? "bottom-3" : "top-3"
            } ${
              config.position.includes("right") ? "right-3" : "left-3"
            }`}
            style={{ backgroundColor: config.primaryColor }}
          >
            <FiMessageCircle className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
