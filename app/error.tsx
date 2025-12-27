'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Root Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4 text-center relative overflow-hidden">
      {/* Background Gradient Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-20 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-20 blur-3xl -z-10" />
      
      <div className="fixed inset-0 z-0 pointer-events-none">
          <AnimatedBackground />
      </div>

      <div className="rounded-2xl bg-white/70 backdrop-blur-md p-8 shadow-xl border border-blue-200 max-w-md w-full relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <div className="mb-2 font-bold text-lg text-indigo-600 uppercase tracking-wide">Navlens Analytics</div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong!</h2>
        <p className="mb-6 text-gray-600">
          We encountered an unexpected error. Our team has been notified.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
             <div className="mb-6 text-left bg-gray-100 p-3 rounded-md overflow-x-auto max-h-32 text-xs text-red-600 font-mono">
                {error.message}
             </div>
        )}

        <div className="flex flex-col gap-3">
            <button
            onClick={reset}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
            Try again
            </button>
            <Link 
                href="/dashboard"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
                Return to Dashboard
            </Link>
        </div>
      </div>
    </div>
  );
}
