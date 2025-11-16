"use client";

import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  PlusIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { createSite, deleteSite } from "./action";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/LoadingSpinner";

// Your deployed Vercel URL is the API host
const NAVLENS_API_HOST = "https://navlens-rho.vercel.app";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4 sm:mb-6">
          Add New Site
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="site_name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Site Name
            </label>
            <input
              type="text"
              id="site_name"
              name="site_name"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="My Awesome Website"
            />
          </div>

          <div>
            <label
              htmlFor="domain"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Domain URL
            </label>
            <input
              type="url"
              id="domain"
              name="domain"
              required
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              placeholder="https://example.com"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Site"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Installation Code
        </h4>
        <CopyToClipboard text={snippet} onCopy={handleCopy}>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <DocumentDuplicateIcon className="w-4 h-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </CopyToClipboard>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Copy and paste this code into the &lt;head&gt; tag of your website.
      </p>
      <pre className="text-xs text-gray-800 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

export default function SiteManager({ sites }: SiteManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSnippetId, setShowSnippetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">
            My Sites
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage and monitor your tracked websites
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md w-full sm:w-auto"
        >
          <PlusIcon className="w-5 h-5" />
          <span className="font-semibold">Add New Site</span>
        </button>
      </div>

      {/* Add Site Modal */}
      {showAddForm && <AddSiteForm onClose={() => setShowAddForm(false)} />}

      {/* Empty State or Sites List */}
      {sites.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-blue-300 p-6 sm:p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 sm:p-4 bg-blue-100 rounded-full">
              <GlobeAltIcon className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-2">
            No Sites Yet
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto px-4">
            Add your first website to start collecting heatmap data and
            analyzing user behavior.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md w-full sm:w-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-semibold">Add Your First Site</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sites Grid */}
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-xl border-2 border-blue-200 p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-blue-900">
                    {site.site_name}
                  </h3>
                  <a
                    href={site.domain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base text-blue-600 hover:underline mt-1 inline-block break-all"
                  >
                    {site.domain}
                  </a>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    Added {new Date(site.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={`/dashboard/heatmap-viewer?siteId=${site.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  >
                    View Heatmap
                  </a>
                  <button
                    onClick={() =>
                      setShowSnippetId(
                        showSnippetId === site.id ? null : site.id
                      )
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
                  >
                    <CodeBracketIcon className="w-4 h-4" />
                    {showSnippetId === site.id ? "Hide" : "Show"} Code
                  </button>
                  <button
                    onClick={() => handleDelete(site.id, site.site_name)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors w-full sm:w-auto"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Snippet Code Block */}
              {showSnippetId === site.id && <SnippetCode site={site} />}
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 sm:gap-4">
          <CodeBracketIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0 mt-1" />
          <div>
            <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2">
              How to Add a Site
            </h4>
            <ol className="text-xs sm:text-sm text-gray-700 space-y-2">
              <li>
                1. Click &ldquo;Add New Site&rdquo; and enter your website URL
              </li>
              <li>2. Copy the generated tracking script</li>
              <li>
                3. Paste it into your website&rsquo;s HTML, just before the
                closing &lt;/body&gt; tag
              </li>
              <li>4. Start collecting data and viewing heatmaps!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
