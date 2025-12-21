'use client';

import { useState } from 'react';
import { 
    MagnifyingGlassIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    GlobeAltIcon 
} from '@heroicons/react/24/outline';

export default function InspectorPage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    async function handleCheck(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/tools/inspect-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            setResult({ connected: false, details: 'Failed to reach API' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <MagnifyingGlassIcon className="w-8 h-8 text-blue-600" />
                    Script Inspector
                </h1>
                <p className="text-gray-500 mt-1">
                    Debug user installations by crawling their site to check for the Navlens tracker.
                </p>
            </div>

            {/* Checker Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                    <form onSubmit={handleCheck} className="flex gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="example.com"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                        >
                            {loading ? 'Scanning...' : 'Check Installation'}
                        </button>
                    </form>
                </div>

                {result && (
                    <div className={`p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-300 ${result.connected ? 'bg-green-50' : 'bg-red-50'}`}>
                        {result.connected ? (
                            <div className="bg-green-100 p-4 rounded-full mb-4">
                                <CheckCircleIcon className="w-12 h-12 text-green-600" />
                            </div>
                        ) : (
                            <div className="bg-red-100 p-4 rounded-full mb-4">
                                <XCircleIcon className="w-12 h-12 text-red-600" />
                            </div>
                        )}
                        
                        <h3 className={`text-xl font-bold mb-2 ${result.connected ? 'text-green-800' : 'text-red-800'}`}>
                            {result.connected ? 'Installation Verified' : 'Script Not Found'}
                        </h3>
                        
                        <p className={`${result.connected ? 'text-green-700' : 'text-red-700'} max-w-md`}>
                            {result.details}
                        </p>

                        {!result.connected && (
                            <div className="mt-6 text-sm text-red-600 bg-white p-4 rounded border border-red-200 text-left w-full max-w-lg">
                                <p className="font-semibold mb-2">Troubleshooting Steps:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Ensure the script tag is in the <code>&lt;head&gt;</code> or body.</li>
                                    <li>Check if the site is publicly accessible (not localhost/intranet).</li>
                                    <li>Verify you copied the correct Site ID.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
