"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  PlusIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  PresentationChartBarIcon,
  CalendarIcon,
  LinkIcon,
  EyeIcon,
  PlayIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { createSite, deleteSite } from "./action";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSite, Site } from "@/app/context/SiteContext";
import PagePathManager from "./PagePathManager";

// Your deployed Vercel URL is the API host
const NAVLENS_API_HOST = process.env.NEXT_PUBLIC_NAVLENS_API_HOST;

interface SiteManagerProps {
  sites: Site[];
}

// --- Add Site Form Component ---
function AddSiteForm({
  onClose,
  onSiteAdded,
}: {
  onClose: () => void;
  onSiteAdded: () => void;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createSite(formData);

    if (result.success) {
      toast.success(result.message);
      setLoading(false);
      onSiteAdded(); // Refresh sites in context
      onClose();
    } else {
      toast.error(result.message);
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Add New Site</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="site_name"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Site Name
            </label>
            <input
              type="text"
              id="site_name"
              name="site_name"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
              placeholder="My Awesome Website"
            />
          </div>

          <div>
            <label
              htmlFor="domain"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Domain URL
            </label>
            <input
              type="url"
              id="domain"
              name="domain"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
              placeholder="https://example.com"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm"
            >
              {loading ? "Adding..." : "Add Site"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Snippet Code Block Component ---
function SnippetCode({ site }: { site: Site }) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Include API key in the snippet for secure tracking
  // rrweb libraries must be loaded BEFORE tracker.js
  const snippet = `
    <script 
      async 
      src="${NAVLENS_API_HOST}/tracker.js" 
      data-site-id="${site.id}"
      data-api-key="${site.api_key}"
      data-api-host="${NAVLENS_API_HOST}"
    ><\/script>`;

  const handleSnippetCopy = () => {
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  const handleApiKeyCopy = () => {
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  // Mask API key for display (show first 8 and last 4 chars)
  const maskedApiKey = site.api_key
    ? `${site.api_key.substring(0, 8)}...${site.api_key.substring(
        site.api_key.length - 4
      )}`
    : "Not set";

  return (
    <div className="mt-6 space-y-4">
      {/* API Key Section */}
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <h4 className="text-sm font-semibold text-gray-900">API Key</h4>
          </div>
          <CopyToClipboard text={site.api_key || ""} onCopy={handleApiKeyCopy}>
            <button
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all duration-200 shadow-sm hover:shadow-md"
              disabled={!site.api_key}
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              {apiKeyCopied ? "Copied!" : "Copy Key"}
            </button>
          </CopyToClipboard>
        </div>
        <p className="text-xs text-gray-600 mb-2">
          This API key authenticates your tracker. Keep it secure and never
          share it publicly.
        </p>
        <div className="bg-white p-2 rounded border border-amber-200 font-mono text-xs text-gray-700">
          {maskedApiKey}
        </div>
      </div>

      {/* Installation Code Section */}
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CodeBracketIcon className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Installation Code
            </h4>
          </div>
          <CopyToClipboard text={snippet} onCopy={handleSnippetCopy}>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md">
              <DocumentDuplicateIcon className="w-4 h-4" />
              {snippetCopied ? "Copied!" : "Copy"}
            </button>
          </CopyToClipboard>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Copy and paste this code into the &lt;head&gt; tag of your website
          (before closing &lt;/head&gt;). The rrweb libraries must load FIRST,
          then the Navlens tracker. This enables session recording and DOM
          snapshots.
        </p>
        <div className="bg-white p-3 rounded-xl border border-indigo-100 overflow-x-auto">
          <pre className="text-xs text-gray-800">
            <code>{snippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function SiteManager({ sites }: SiteManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSnippetId, setShowSnippetId] = useState<string | null>(null);
  const [showPathManagerId, setShowPathManagerId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { setSelectedSiteId, fetchSites } = useSite();
  const router = useRouter();

  // Site status tracking
  const [siteStatuses, setSiteStatuses] = useState<Record<string, { hasRecentEvents: boolean; lastEventTime: string | null }>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch site statuses on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      if (sites.length === 0) {
        setStatusLoading(false);
        return;
      }

      try {
        const siteIds = sites.map(s => s.id);
        const res = await fetch('/api/sites/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteIds })
        });

        if (res.ok) {
          const data = await res.json();
          const statusMap: Record<string, { hasRecentEvents: boolean; lastEventTime: string | null }> = {};
          for (const status of data.statuses) {
            statusMap[status.siteId] = {
              hasRecentEvents: status.hasRecentEvents,
              lastEventTime: status.lastEventTime
            };
          }
          setSiteStatuses(statusMap);
        }
      } catch (error) {
        console.error('Failed to fetch site statuses:', error);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatuses();
  }, [sites]);

  // Toggle tracking for a site
  const toggleTracking = async (siteId: string, currentState: boolean) => {
    setTogglingId(siteId);
    try {
      const res = await fetch(`/api/sites/${siteId}/toggle-tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_tracking_enabled: !currentState })
      });

      if (res.ok) {
        toast.success(currentState ? 'Tracking paused' : 'Tracking enabled');
        await fetchSites(true); // Refresh to get updated state
      } else {
        toast.error('Failed to update tracking status');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setTogglingId(null);
    }
  };

  // Force refresh sites in context (bypass cache)
  const refreshSites = async () => {
    await fetchSites(true); // Force refresh, bypass cache
  };

  const handleViewHeatmap = (siteId: string) => {
    // Set the site ID in context
    setSelectedSiteId(siteId);
    // Navigate to heatmap viewer without query params
    router.push("/dashboard/heatmaps/heatmap-viewer");
  };

  const handleDelete = async (siteId: string, siteName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${siteName}"? This action cannot be undone.`
      )
    ) {
      setIsLoading(true);
      await deleteSite(siteId);
      await refreshSites(); // Refresh sites after deletion
      setIsLoading(false);
      toast.success(`Site "${siteName}" has been deleted.`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Processing..." />;
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Sites</h1>
                <p className="text-gray-600 mt-1 text-xs">
                  Manage and monitor your tracked websites
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 font-semibold w-full sm:w-auto text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add New Site</span>
              </button>
            </div>
          </div>

          {/* Add Site Modal */}
          {showAddForm && (
            <AddSiteForm
              onClose={() => setShowAddForm(false)}
              onSiteAdded={refreshSites}
            />
          )}

          {/* Empty State or Sites List */}
          {sites.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-6 sm:p-10 text-center shadow-sm">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-indigo-50 rounded-2xl">
                  <GlobeAltIcon className="w-12 h-12 text-indigo-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No Sites Yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                Add your first website to start collecting heatmap data and
                analyzing user behavior.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-semibold text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Your First Site</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Sites Grid - now 2 columns on larger screens */}
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden group"
                >
                  {/* Card Header - Clean White with Accent */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                          <GlobeAltIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 truncate max-w-[200px]">
                            {site.site_name}
                          </h3>
                          <a
                            href={`https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            {site.domain}
                          </a>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(site.id, site.site_name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Delete site"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <CalendarIcon className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Added</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <ChartBarIcon className={`w-5 h-5 mx-auto mb-1 ${
                          statusLoading ? 'text-gray-400' :
                          siteStatuses[site.id]?.hasRecentEvents ? 'text-green-500' : 'text-amber-500'
                        }`} />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Status</p>
                        {statusLoading ? (
                          <p className="text-sm font-bold text-gray-400">...</p>
                        ) : (
                          <p className={`text-sm font-bold ${
                            siteStatuses[site.id]?.hasRecentEvents ? 'text-green-600' : 'text-amber-600'
                          }`}>
                            {siteStatuses[site.id]?.hasRecentEvents ? 'Active' : 'Inactive'}
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={() => toggleTracking(site.id, site.is_tracking_enabled ?? true)}
                        disabled={togglingId === site.id}
                        className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer disabled:opacity-50"
                        title="Click to toggle tracking"
                      >
                        <EyeIcon className={`w-5 h-5 mx-auto mb-1 ${
                          (site.is_tracking_enabled ?? true) ? 'text-purple-500' : 'text-gray-400'
                        }`} />
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Tracking</p>
                        <p className={`text-sm font-bold ${
                          togglingId === site.id ? 'text-gray-400' :
                          (site.is_tracking_enabled ?? true) ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {togglingId === site.id ? '...' : (site.is_tracking_enabled ?? true) ? 'On' : 'Off'}
                        </p>
                      </button>
                    </div>

                    {/* Primary Action */}
                    <button
                      onClick={() => handleViewHeatmap(site.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg group-hover:-translate-y-0.5 mb-4"
                    >
                      <PresentationChartBarIcon className="w-5 h-5" />
                      View Heatmaps & Analytics
                    </button>

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setShowSnippetId(
                            showSnippetId === site.id ? null : site.id
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          showSnippetId === site.id
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent'
                        }`}
                      >
                        <CodeBracketIcon className="w-4 h-4" />
                        {showSnippetId === site.id ? "Hide Code" : "Get Code"}
                      </button>
                      <button
                        onClick={() =>
                          setShowPathManagerId(
                            showPathManagerId === site.id ? null : site.id
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          showPathManagerId === site.id
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent'
                        }`}
                      >
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform ${
                            showPathManagerId === site.id ? "rotate-180" : ""
                          }`}
                        />
                        Manage Paths
                      </button>
                    </div>
                  </div>

                  {/* Expandable Sections */}
                  {showSnippetId === site.id && (
                    <div className="border-t border-gray-100">
                      <SnippetCode site={site} />
                    </div>
                  )}

                  {showPathManagerId === site.id && (
                    <div className="border-t border-gray-100 p-5">
                      <PagePathManager
                        siteId={site.id}
                        siteName={site.site_name}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info Card */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl shrink-0">
                <CodeBracketIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">
                  How to Add a Site
                </h4>
                <ol className="text-gray-700 space-y-1.5 text-xs">
                  <li>
                    1. Click &quot;Add New Site&quot; and enter your website URL
                  </li>
                  <li>2. Copy the generated tracking script</li>
                  <li>
                    3. Paste it into your website&apos;s HTML, just before the
                    closing &lt;/body&gt; tag
                  </li>
                  <li>4. Start collecting data and viewing heatmaps!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
