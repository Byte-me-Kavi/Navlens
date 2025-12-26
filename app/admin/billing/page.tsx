"use client";

import React, { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, AlertTriangle, Users, Mail, ExternalLink } from 'lucide-react';

interface BillingUser {
    user_id: string;
    email: string;
    plan_name: string;
    status: string;
    usage: number;
    limit: number;
    usage_percent: number;
    sessions_used: number;
    sessions_limit: number;
    recordings_used: number;
    recordings_limit: number;
    sites_count: number;
    sites_limit: number;
    active_experiments: number;
    experiments_limit: number;
    active_surveys: number;
    surveys_limit: number;
    heatmap_pages_limit: number;
    retention_days: number;
    period_start: string | null;
    is_churned: boolean;
    churn_date?: string;
}

interface Stats {
    total_users: number;
    over_limit: number;
    recent_churn_count: number;
    mrr: number;
    plan_counts: Record<string, number>;
}

export default function AdminBillingPage() {
    const [users, setUsers] = useState<BillingUser[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBilling = async () => {
            try {
                const res = await fetch('/api/admin/billing/overview');
                const data = await res.json();
                if (data.users) {
                    setUsers(data.users);
                    setStats(data.stats);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBilling();
    }, []);

    const overLimitUsers = users.filter(u => u.sessions_used > u.sessions_limit && u.sessions_limit > 0);
    const churnedUsers = users.filter(u => u.is_churned);
    const planCounts = stats?.plan_counts || {};
    
    const formatLimit = (val: number) => val === -1 || val === 0 ? '∞' : val.toLocaleString();
    
    const getUsageColor = (used: number, limit: number) => {
        if (limit <= 0 || limit === -1) return 'text-slate-600';
        const percent = (used / limit) * 100;
        if (percent >= 100) return 'text-red-600 font-bold';
        if (percent >= 80) return 'text-amber-600';
        return 'text-slate-600';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <CreditCard className="w-7 h-7 text-indigo-600" />
                    Usage & Billing
                </h1>
                <p className="text-slate-500 text-sm mt-1">Monitor subscription usage across all users</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-indigo-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">MRR</p>
                            <p className="text-2xl font-bold text-indigo-600 mt-1">${(stats?.mrr || 0).toLocaleString()}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-indigo-200" />
                    </div>
                </div>
                
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Subs</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">
                                {users.filter(u => u.status === 'active' && !u.is_churned).length}
                            </p>
                        </div>
                        <Users className="w-8 h-8 text-slate-200" />
                    </div>
                </div>
                
                <div className="bg-white border border-red-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Over Limit</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{overLimitUsers.length}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-200" />
                    </div>
                </div>
                
                <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Plan Breakdown</p>
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(planCounts).map(([plan, count]) => (
                            <span key={plan} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded">
                                {plan}: {count}
                            </span>
                        ))}
                        {Object.keys(planCounts).length === 0 && (
                            <span className="text-slate-400 text-xs">No data</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-semibold text-slate-800">User Usage Details</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Plan</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Sessions</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Recordings</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Sites</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">A/B Tests</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-600">Surveys</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-600">Retention</th>
                                <th className="text-center px-4 py-3 font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                        Loading usage data...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                        No users found
                                    </td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.user_id} className="hover:bg-indigo-50/30 transition-colors">
                                    {/* User */}
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{user.email}</div>
                                        <div className="text-xs text-slate-400 font-mono">{user.user_id.slice(0, 8)}</div>
                                    </td>
                                    
                                    {/* Plan */}
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                            user.plan_name === 'Pro' ? 'bg-indigo-100 text-indigo-700' :
                                            user.plan_name === 'Enterprise' ? 'bg-violet-100 text-violet-700' :
                                            user.plan_name === 'Starter' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {user.plan_name}
                                        </span>
                                        {user.is_churned && (
                                            <span className="ml-1 text-xs text-red-500 font-medium">Cancelled</span>
                                        )}
                                    </td>
                                    
                                    {/* Sessions */}
                                    <td className={`px-4 py-3 text-right font-mono ${getUsageColor(user.sessions_used, user.sessions_limit)}`}>
                                        {user.sessions_used.toLocaleString()}<span className="text-slate-400">/{formatLimit(user.sessions_limit)}</span>
                                    </td>
                                    
                                    {/* Recordings */}
                                    <td className={`px-4 py-3 text-right font-mono ${getUsageColor(user.recordings_used, user.recordings_limit)}`}>
                                        {user.recordings_used.toLocaleString()}<span className="text-slate-400">/{formatLimit(user.recordings_limit)}</span>
                                    </td>
                                    
                                    {/* Sites */}
                                    <td className={`px-4 py-3 text-right font-mono ${getUsageColor(user.sites_count, user.sites_limit)}`}>
                                        {user.sites_count}<span className="text-slate-400">/{formatLimit(user.sites_limit)}</span>
                                    </td>
                                    
                                    {/* A/B Tests */}
                                    <td className={`px-4 py-3 text-right font-mono ${getUsageColor(user.active_experiments, user.experiments_limit)}`}>
                                        {user.active_experiments}<span className="text-slate-400">/{formatLimit(user.experiments_limit)}</span>
                                    </td>
                                    
                                    {/* Surveys */}
                                    <td className={`px-4 py-3 text-right font-mono ${getUsageColor(user.active_surveys, user.surveys_limit)}`}>
                                        {user.active_surveys}<span className="text-slate-400">/{formatLimit(user.surveys_limit)}</span>
                                    </td>
                                    
                                    {/* Retention */}
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-slate-600 font-medium">{user.retention_days}d</span>
                                    </td>
                                    
                                    {/* Action */}
                                    <td className="px-4 py-3 text-center">
                                        <a 
                                            href={`mailto:${user.email}`}
                                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                        >
                                            <Mail className="w-3 h-3" />
                                            Email
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alerts Section */}
            {overLimitUsers.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4" />
                        Users Over Limit ({overLimitUsers.length})
                    </h3>
                    <div className="grid gap-2">
                        {overLimitUsers.slice(0, 5).map(u => (
                            <div key={u.user_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                                <span className="font-medium text-slate-800 text-sm">{u.email}</span>
                                <span className="text-red-600 text-sm font-mono">
                                    {u.sessions_used}/{u.sessions_limit} sessions
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {churnedUsers.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                        <ExternalLink className="w-4 h-4" />
                        Recently Cancelled ({churnedUsers.length})
                    </h3>
                    <div className="grid gap-2">
                        {churnedUsers.slice(0, 5).map(u => (
                            <div key={u.user_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                                <span className="font-medium text-slate-800 text-sm">{u.email}</span>
                                <span className="text-amber-600 text-sm">
                                    {u.churn_date ? new Date(u.churn_date).toLocaleDateString() : 'Recently'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
