"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { secureApi } from "@/lib/secureApi";
import { TrashIcon } from "@heroicons/react/24/outline";

interface PagePathManagerProps {
  siteId: string;
  siteName: string;
}

interface DeleteConfirmModal {
  isOpen: boolean;
  pathToDelete: string | null;
}

export default function PagePathManager({
  siteId,
  siteName,
}: PagePathManagerProps) {
  const [pagePaths, setPagePaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteConfirmModal>({
    isOpen: false,
    pathToDelete: null,
  });

  // Fetch page paths for this site from ClickHouse
  useEffect(() => {
    const fetchPagePaths = async () => {
      setLoading(true);
      try {
        // Use POST request to hide siteId from URL
        const data = await secureApi.sites.paths.list(siteId);
        setPagePaths(data.pagePaths || []);
      } catch (err) {
        console.error("Error fetching page paths:", err);
        toast.error("Failed to load page paths");
      } finally {
        setLoading(false);
      }
    };

    fetchPagePaths();
  }, [siteId]);

  // Delete page path from ClickHouse
  const handleDeletePath = async () => {
    const pathValue = deleteModal.pathToDelete;
    if (!pathValue) return;

    setDeleteModal({ isOpen: false, pathToDelete: null });
    setDeletingPath(pathValue);

    try {
      // Step 1: Delete from manage-page-paths (removes existing events)
      // Step 1: Delete from manage-page-paths (removes existing events)
      await secureApi.sites.paths.delete(siteId, pathValue);

      // Step 2: Add to exclusion list (prevents future data collection)
      try {
        await secureApi.sites.paths.exclude(siteId, pathValue);
      } catch (err) {
        console.warn(
          "Warning: Path excluded from future collection but could not update exclusion list",
          err
        );
      }

      setPagePaths(pagePaths.filter((p) => p !== pathValue));
      toast.success(
        `✓ Path "${pathValue}" deleted and excluded from future data collection`
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete page path";
      console.error("Error deleting page path:", err);
      toast.error(errorMessage);
    } finally {
      setDeletingPath(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Tracked Page Paths - {siteName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Paths are automatically discovered from your site&apos;s analytics
          events
        </p>
      </div>

      {/* Page Paths List */}
      {pagePaths.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No page paths tracked yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Send events from your site to see tracked paths here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagePaths.map((path) => (
            <div
              key={path}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 font-mono">
                  {path}
                </p>
              </div>
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: true, pathToDelete: path })
                }
                disabled={deletingPath === path}
                className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete this page path"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 space-y-3">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>ℹ️ About Paths:</strong> Paths are automatically discovered
            from your site&apos;s analytics events.
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-xs text-red-900 space-y-1">
            <div>
              <strong>⚠️ Deleting a Path:</strong>
            </div>
            <div>
              • All existing events for that path are permanently deleted
            </div>
            <div>• Future data from that path will NOT be collected</div>
            <div>• Once deleted, this cannot be undone</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Delete Page Path
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  You are about to delete:
                </p>
                <div className="bg-gray-50 rounded px-3 py-2 border border-gray-200">
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {deleteModal.pathToDelete}
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-red-50 rounded-lg p-3 border border-red-200">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold shrink-0">•</span>
                  <p className="text-sm text-red-900">
                    <strong>Permanent deletion:</strong> All existing events for
                    this path will be permanently deleted from ClickHouse
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold shrink-0">•</span>
                  <p className="text-sm text-red-900">
                    <strong>Future exclusion:</strong> This path will be added
                    to the exclusion list to prevent future data collection
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold shrink-0">•</span>
                  <p className="text-sm text-red-900">
                    <strong>Cannot be undone:</strong> This action is permanent
                    and irreversible
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, pathToDelete: null })
                }
                disabled={deletingPath !== null}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePath}
                disabled={deletingPath !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deletingPath ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    Delete Path
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
