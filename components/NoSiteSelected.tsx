'use client';

import { FiGlobe, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';

interface NoSiteSelectedProps {
  featureName: string;
  description?: string;
}

/**
 * Shared component shown when no site is selected in the sidebar.
 * Provides a consistent UI across all feature pages.
 */
export default function NoSiteSelected({ featureName, description }: NoSiteSelectedProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
      <div className="inline-flex p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full mb-4">
        <FiGlobe className="w-12 h-12 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No Site Selected
      </h3>
      <p className="text-gray-600 mb-2">
        Select a site from the sidebar to view {featureName}.
      </p>
      {description && (
        <p className="text-gray-500 text-sm mb-4">{description}</p>
      )}
      <div className="flex items-center justify-center gap-2 text-blue-600 text-sm font-medium">
        <FiArrowRight className="w-4 h-4" />
        <span>Use the site selector in the sidebar</span>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function NoSiteSelectedCompact({ featureName }: { featureName: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-6 bg-blue-50 rounded-lg border border-blue-100">
      <FiGlobe className="w-5 h-5 text-blue-600" />
      <span className="text-blue-900 font-medium">
        Select a site from the sidebar to view {featureName}
      </span>
    </div>
  );
}

/**
 * Empty state for users with no sites at all
 */
export function NoSitesAvailable() {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-8 border border-orange-200 text-center">
      <div className="inline-flex p-3 bg-white rounded-full mb-3 shadow-sm">
        <FiGlobe className="w-8 h-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No Sites Available
      </h3>
      <p className="text-gray-600 mb-4">
        Get started by creating your first site
      </p>
      <Link
        href="/dashboard/my-sites"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:scale-105"
      >
        <FiGlobe className="w-4 h-4" />
        Create Site
      </Link>
    </div>
  );
}
