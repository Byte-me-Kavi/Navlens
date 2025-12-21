"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe, Search, Shield, ShieldAlert, CheckCircle, ExternalLink, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Site {
    id: string;
    site_name: string;
    domain: string;
    created_at: string;
    status: 'active' | 'banned' | 'archived';
    user_id: string;
    owner_email: string;
}

function SitesContent() {
    const searchParams = useSearchParams();
    const userIdFilter = searchParams.get('userId');
    
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchSites = async () => {
        setLoading(true);
        try {
            let url = '/api/admin/sites?perPage=50';
            if (userIdFilter) url += `&userId=${userIdFilter}`;
            
            const res = await fetch(url);
            const data = await res.json();
            if (data.sites) {
                setSites(data.sites);
            }
        } catch (error) {
            toast.error('Failed to load sites');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSites();
    }, [userIdFilter]);

    const toggleStatus = async (site: Site) => {
        setProcessingId(site.id);
        const newStatus = site.status === 'banned' ? 'active' : 'banned';
        
        try {
            const res = await fetch(`/api/admin/sites/${site.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success(newStatus === 'banned' ? 'Site Banned' : 'Site Activated');
                setSites(prev => prev.map(s => s.id === site.id ? { ...s, status: newStatus } : s));
            } else {
                toast.error('Failed to update status');
            }
        } catch (e) {
            toast.error('Network error');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredSites = sites.filter(s => 
        s.site_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.owner_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Globe className="w-8 h-8 text-blue-500" />
                        Site Management
                    </h1>
                    <p className="text-slate-500">
                        {userIdFilter ? `Showing sites for selected user` : 'Manage all tracked websites.'}
                        {userIdFilter && (
                            <a href="/admin/users" className="ml-2 text-blue-600 hover:underline text-sm font-medium">
                                ← Back to Users
                            </a>
                        )}
                    </p>
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search sites..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/70 backdrop-blur border border-white/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </header>

            {/* Sites Table */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-xl shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-4">Site Info</th>
                                <th className="px-6 py-4">Owner</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Loading sites...</td></tr>
                            ) : filteredSites.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No sites found.</td></tr>
                            ) : (
                                filteredSites.map((site) => (
                                    <tr key={site.id} className="hover:bg-white/60 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-700">{site.site_name}</span>
                                                <a href={site.domain} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                    {site.domain} <ExternalLink className="w-3 h-3"/>
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {site.owner_email}
                                        </td>
                                        <td className="px-6 py-4">
                                            {site.status === 'banned' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    Banned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(site.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                disabled={processingId === site.id}
                                                onClick={() => toggleStatus(site)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                                    site.status === 'banned' 
                                                    ? 'bg-white border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200'
                                                }`}
                                            >
                                                {processingId === site.id ? '...' : site.status === 'banned' ? 'Activate' : 'Ban Site'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function AdminSitesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading...</div>}>
            <SitesContent />
        </Suspense>
    );
}
