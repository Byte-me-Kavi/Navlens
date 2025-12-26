"use client";

import { useState } from "react";
import { ShareIcon, CheckIcon, LinkIcon } from "@heroicons/react/24/outline";

interface ShareReportButtonProps {
  siteId: string;
  days: number;
  include?: string;
  expiresInDays?: number;
}

export function ShareReportButton({ siteId, days, include, expiresInDays }: ShareReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleShare = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          days,
          include: include || 'all',
          expiresInDays
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Share API Error Response:', errorData);
        throw new Error(errorData.error || 'Failed to generate share link');
      }

      const data = await response.json();
      const url = data.share.url;
      
      setShareUrl(url);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      setCopied(true);
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
      
    } catch (error) {
      console.error('Share error:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      {shareUrl && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs">
          <LinkIcon className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600 truncate max-w-[200px]">{shareUrl}</span>
        </div>
      )}
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Generating...
          </>
        ) : copied ? (
          <>
            <CheckIcon className="w-4 h-4" />
            Link Copied!
          </>
        ) : (
          <>
            <ShareIcon className="w-4 h-4" />
            Share Report
          </>
        )}
      </button>
    </div>
  );
}
