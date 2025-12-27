'use client';

import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

// Global error must include html and body tags
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="antialiased bg-linear-to-br from-white via-blue-50/30 to-purple-50/20">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-20 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-20 blur-3xl -z-10" />

        <div className="fixed inset-0 z-0 pointer-events-none">
            <AnimatedBackground />
        </div>
        <div className="flex h-screen w-full flex-col items-center justify-center bg-transparent px-4 text-center relative overflow-hidden z-10">

            <div className="mb-8 font-extrabold text-3xl text-indigo-600 tracking-tight z-10">
                Navlens Analytics
            </div>

            <div className="relative z-10 max-w-lg bg-white/70 backdrop-blur-md p-8 rounded-2xl border border-blue-200 shadow-xl">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Critical System Error</h2>
                <p className="text-gray-600 mb-6">Application failed to load completely. Please verify your connection and reload.</p>
                <button
                onClick={() => reset()}
                className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
                >
                Reload Application
                </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 max-w-2xl w-full z-10">
                    <div className="bg-gray-900 rounded-lg p-4 overflow-hidden border border-gray-700 shadow-2xl text-left">
                        <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-xs text-gray-400 font-mono ml-2">Developer Error Log</span>
                        </div>
                        <pre className="overflow-auto text-xs text-red-400 font-mono max-h-64 whitespace-pre-wrap">
                            {error.message}
                            {'\n\n'}
                            {error.stack}
                        </pre>
                    </div>
                </div>
            )}
        </div>
      </body>
    </html>
  );
}
