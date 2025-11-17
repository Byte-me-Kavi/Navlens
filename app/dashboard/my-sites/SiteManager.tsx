"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  PlusIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { createSite, deleteSite } from "./action";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSite } from "@/app/context/SiteContext";
import PagePathManager from "./PagePathManager";

// Your deployed Vercel URL is the API host
const NAVLENS_API_HOST = process.env.NEXT_PUBLIC_NAVLENS_API_HOST;

export type Site = {
  id: string;
  created_at: string;
  site_name: string;
  domain: string;
  api_key: string;
  user_id: string;
};

interface SiteManagerProps {
  sites: Site[];
}

// --- Add Site Form Component ---
function AddSiteForm({ onClose }: { onClose: () => void }) {
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
      onClose();
    } else {
      toast.error(result.message);
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Site</h2>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="site_name"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Site Name
            </label>
            <input
              type="text"
              id="site_name"
              name="site_name"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="My Awesome Website"
            />
          </div>

          <div>
            <label
              htmlFor="domain"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Domain URL
            </label>
            <input
              type="url"
              id="domain"
              name="domain"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-all duration-200 bg-gray-50 focus:bg-white"
              placeholder="https://example.com"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? "Adding..." : "Add Site"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
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
  const [copied, setCopied] = useState(false);

  const snippet = `<script 
  async 
  src="${NAVLENS_API_HOST}/tracker.js" 
  data-site-id="${site.id}"
  data-api-host="${NAVLENS_API_HOST}"
></script>`;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CodeBracketIcon className="w-5 h-5 text-blue-600" />
          <h4 className="text-base font-semibold text-gray-900">
            Installation Code
          </h4>
        </div>
        <CopyToClipboard text={snippet} onCopy={handleCopy}>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md">
            <DocumentDuplicateIcon className="w-4 h-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </CopyToClipboard>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Copy and paste this code into the &lt;head&gt; tag of your website.
      </p>
      <div className="bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
        <pre className="text-sm text-gray-800">
          <code>{snippet}</code>
        </pre>
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
  const { setSelectedSiteId } = useSite();
  const router = useRouter();

  const handleViewHeatmap = (siteId: string) => {
    // Set the site ID in context
    setSelectedSiteId(siteId);
    // Navigate to heatmap viewer without query params
    router.push("/dashboard/heatmap-viewer");
  };

  const handleDelete = async (siteId: string, siteName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${siteName}"? This action cannot be undone.`
      )
    ) {
      setIsLoading(true);
      await deleteSite(siteId);
      setIsLoading(false);
      toast.success(`Site "${siteName}" has been deleted.`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Processing..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Sites</h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Manage and monitor your tracked websites
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-lg font-semibold w-full sm:w-auto"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add New Site</span>
              </button>
            </div>
          </div>

          {/* Add Site Modal */}
          {showAddForm && <AddSiteForm onClose={() => setShowAddForm(false)} />}

          {/* Empty State or Sites List */}
          {sites.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-8 sm:p-12 text-center shadow-sm">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-50 rounded-full">
                  <GlobeAltIcon className="w-16 h-16 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Sites Yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                Add your first website to start collecting heatmap data and
                analyzing user behavior.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-lg font-semibold"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Your First Site</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sites Grid */}
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {site.site_name}
                      </h3>
                      <a
                        href={site.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 transition-colors text-lg font-medium inline-block break-all"
                      >
                        {site.domain}
                      </a>
                      <p className="text-sm text-gray-500 mt-2">
                        Added {new Date(site.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleViewHeatmap(site.id)}
                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        View Heatmap
                      </button>
                      <button
                        onClick={() =>
                          setShowPathManagerId(
                            showPathManagerId === site.id ? null : site.id
                          )
                        }
                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all duration-200"
                      >
                        <ChevronDownIcon
                          className={`w-4 h-4 transition-transform ${
                            showPathManagerId === site.id ? "rotate-180" : ""
                          }`}
                        />
                        Manage Paths
                      </button>
                      <button
                        onClick={() =>
                          setShowSnippetId(
                            showSnippetId === site.id ? null : site.id
                          )
                        }
                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200"
                      >
                        <CodeBracketIcon className="w-4 h-4" />
                        {showSnippetId === site.id ? "Hide" : "Show"} Code
                      </button>
                      <button
                        onClick={() => handleDelete(site.id, site.site_name)}
                        className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all duration-200"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Snippet Code Block */}
                  {showSnippetId === site.id && <SnippetCode site={site} />}

                  {/* Page Path Manager */}
                  {showPathManagerId === site.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
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
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CodeBracketIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-3">
                  How to Add a Site
                </h4>
                <ol className="text-gray-700 space-y-2 text-base">
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
