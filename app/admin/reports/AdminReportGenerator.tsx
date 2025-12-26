"use client";

import React, { useState } from "react";
import {
  CalendarIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  PresentationChartBarIcon,
  SignalIcon,
  BeakerIcon,
  MapIcon,
  FunnelIcon,
  QueueListIcon,
  CursorArrowRaysIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  PlayCircleIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";

interface Site {
  id: string;
  domain: string;
  site_name?: string;
  created_at: string;
}

interface AdminReportGeneratorProps {
  sites: Site[];
}

export default function AdminReportGenerator({ sites }: AdminReportGeneratorProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [dateRange, setDateRange] = useState<"7" | "15" | "30">("30");
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set([
      "summary",
      "traffic",
      "heatmaps_clicks",
      "heatmaps_scrolls",
      "heatmaps_elements", 
      "network",
      "journey",
      "forms",
      "frustration",
      "mobile_audit",
      "experiments",
      "sessions",
      "sessions",
      "cohorts",
      "feedback",
      "funnels"
    ])
  );

  const currentSite = sites.find((s) => s.id === selectedSiteId);

  const toggleFeature = (key: string) => {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const generateReport = () => {
    if (!selectedSiteId) return;

    // Build query params
    const featuresList = Array.from(selectedFeatures).join(",");
    const url = `/report-preview/${selectedSiteId}?days=${dateRange}&include=${featuresList}`;

    // Open in new tab
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8">
      
      {/* Site Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <label className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-indigo-600" />
            Select Client Site
        </label>
        <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-full mt-2 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
            <option value="" disabled>-- Choose a site --</option>
            {sites.map((site) => (
                <option key={site.id} value={site.id}>
                    {site.domain} {site.site_name ? `(${site.site_name})` : ''}
                </option>
            ))}
        </select>
        {selectedSiteId && (
            <p className="text-sm text-gray-500 mt-2">
                Selected ID: <span className="font-mono bg-gray-100 px-1 rounded">{selectedSiteId}</span>
            </p>
        )}
      </div>

      {selectedSiteId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Configuration Column */}
            <div className="md:col-span-2 space-y-6">
              
              {/* 1. Date Range */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  Reporting Period
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {(["7", "15", "30"] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setDateRange(days)}
                      className={`
                        flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                        ${
                          dateRange === days
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-gray-100 bg-white text-gray-600 hover:border-indigo-200"
                        }
                      `}
                    >
                      <span className="text-2xl font-bold">{days}</span>
                      <span className="text-xs font-medium uppercase tracking-wide">Days</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                   Data will be fetched from the last {dateRange} days relative to generation time.
                </p>
              </div>

              {/* 2. Content Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <QueueListIcon className="w-5 h-5 text-indigo-600" />
                  Report Sections
                </h2>
                
                <div className="space-y-4">
                  <FeatureCheckbox
                    id="summary"
                    label="Executive Summary"
                    description="High-level metrics: Visitors, Sessions, Bounce Rate, etc."
                    checked={selectedFeatures.has("summary")}
                    onChange={() => toggleFeature("summary")}
                    icon={PresentationChartBarIcon}
                  />
                  
                  <FeatureCheckbox
                    id="traffic"
                    label="Traffic Overview"
                    description="Device breakdown and browser stats"
                    checked={selectedFeatures.has("traffic")}
                    onChange={() => toggleFeature("traffic")}
                    icon={SignalIcon}
                  />

                  <div className="border-t border-gray-100 pt-4 mt-4">
                     <h3 className="text-sm font-medium text-gray-900 mb-3">Heatmaps & Engagement</h3>
                     <div className="pl-4 space-y-3 border-l-2 border-gray-100">
                        <FeatureCheckbox
                          id="heatmaps_clicks"
                          label="Click Heatmaps"
                          checked={selectedFeatures.has("heatmaps_clicks")}
                          onChange={() => toggleFeature("heatmaps_clicks")}
                          icon={CursorArrowRaysIcon}
                          small
                        />
                         <FeatureCheckbox
                          id="heatmaps_scrolls"
                          label="Scroll Heatmaps"
                          checked={selectedFeatures.has("heatmaps_scrolls")}
                          onChange={() => toggleFeature("heatmaps_scrolls")}
                          icon={ArrowTopRightOnSquareIcon}
                          small
                        />
                         <FeatureCheckbox
                          id="heatmaps_elements"
                          label="Smart Element Analysis"
                          checked={selectedFeatures.has("heatmaps_elements")}
                          onChange={() => toggleFeature("heatmaps_elements")}
                          icon={MapIcon}
                          small
                        />
                     </div>
                  </div>

                  <FeatureCheckbox
                    id="funnels"
                    label="Conversion Funnels"
                    description="Step-by-step conversion analysis and drop-off rates"
                    checked={selectedFeatures.has("funnels")}
                    onChange={() => toggleFeature("funnels")}
                    icon={FunnelIcon}
                  />

                  <FeatureCheckbox
                    id="journey"
                    label="User Journeys"
                    description="Common navigation flows and drop-off points"
                    checked={selectedFeatures.has("journey")}
                    onChange={() => toggleFeature("journey")}
                    icon={FunnelIcon}
                  />

                  <FeatureCheckbox
                    id="network"
                    label="Network Health & Vitals"
                    description="Core Web Vitals (LCP, CLS) and API error rates"
                    checked={selectedFeatures.has("network")}
                    onChange={() => toggleFeature("network")}
                    icon={SignalIcon}
                  />

                  <FeatureCheckbox
                    id="frustration"
                    label="Frustration Signals"
                    description="Rage clicks, dead clicks, and JavaScript errors"
                    checked={selectedFeatures.has("frustration")}
                    onChange={() => toggleFeature("frustration")}
                    icon={BeakerIcon}
                  />

                  <FeatureCheckbox
                    id="forms"
                    label="Form Analytics"
                    description="Field-level drop-offs, refill rates, and time-to-complete"
                    checked={selectedFeatures.has("forms")}
                    onChange={() => toggleFeature("forms")}
                    icon={DocumentTextIcon}
                  />

                  <div className="border-t border-gray-100 pt-4 mt-4">
                     <h3 className="text-sm font-medium text-gray-900 mb-3">Premium Insights</h3>
                     <div className="space-y-3">
                       <FeatureCheckbox
                         id="mobile_audit"
                         label="Mobile Usability Audit"
                         description="Device comparison and mobile-specific friction analysis"
                         checked={selectedFeatures.has("mobile_audit")}
                         onChange={() => toggleFeature("mobile_audit")}
                         icon={DevicePhoneMobileIcon}
                       />
                       <FeatureCheckbox
                         id="experiments"
                         label="A/B Experiments"
                         description="Active experiment results with statistical significance"
                         checked={selectedFeatures.has("experiments")}
                         onChange={() => toggleFeature("experiments")}
                         icon={BeakerIcon}
                       />
                       <FeatureCheckbox
                         id="sessions"
                         label="Session Spotlights"
                         description="Curated session replays demonstrating user struggles"
                         checked={selectedFeatures.has("sessions")}
                         onChange={() => toggleFeature("sessions")}
                         icon={PlayCircleIcon}
                       />
                     </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-4">
                     <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Insights</h3>
                     <FeatureCheckbox
                        id="cohorts"
                        label="Cohorts"
                        description="User segmentation analysis"
                        checked={selectedFeatures.has("cohorts")}
                        onChange={() => toggleFeature("cohorts")}
                        icon={QueueListIcon}
                        small
                      />
                      <div className="mt-3">
                        <FeatureCheckbox
                          id="feedback"
                          label="User Feedback"
                          description="Direct user feedback and ratings"
                          checked={selectedFeatures.has("feedback")}
                          onChange={() => toggleFeature("feedback")}
                          icon={CheckCircleIcon}
                          small
                        />
                      </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Column */}
            <div className="space-y-6">
              <div className="sticky top-6">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">Ready to Export?</h3>
                    <p className="text-indigo-100 text-sm mb-6">
                      Generate a high-quality PDF report for <strong>{currentSite?.domain}</strong>.
                    </p>
                    
                    <button
                      onClick={generateReport}
                      className="w-full bg-white text-indigo-700 font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-gray-50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                      Generate Preview
                    </button>
                    <p className="text-xs text-indigo-200 mt-3 text-center">
                      Opens in a new tab. Use <strong>Ctrl+P</strong> to save as PDF.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                     <h3 className="font-semibold text-gray-900 mb-2">Estimated Content</h3>
                     <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex justify-between">
                           <span>Pages:</span>
                           <span className="font-mono font-medium">~{5 + (selectedFeatures.has('heatmaps_clicks') ? 5 : 0)}</span>
                        </li>
                        <li className="flex justify-between">
                           <span>Heatmaps:</span>
                           <span className="font-mono font-medium">{selectedFeatures.has('heatmaps_clicks') ? '5 Paths' : '0'}</span>
                        </li>
                     </ul>
                  </div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}

function FeatureCheckbox({
  id,
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  small = false
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ComponentType<{ className?: string }>;
  small?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`
        flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
        ${
          checked
            ? "border-indigo-600 bg-indigo-50/50"
            : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
        }
        ${small ? 'py-2 px-3' : ''}
      `}
    >
      <div className={`
        rounded-full flex items-center justify-center shrink-0
        ${checked ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"}
        ${small ? 'w-6 h-6' : 'w-10 h-10'}
      `}>
        {checked ? <CheckCircleIcon className="w-3/4 h-3/4" /> : <Icon className="w-1/2 h-1/2" />}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`font-semibold ${checked ? "text-indigo-900" : "text-gray-900"} ${small ? 'text-sm' : ''}`}>
            {label}
          </span>
          <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
          />
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}
