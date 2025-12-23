"use client";

import React, { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, AlertTriangle, Users, Mail } from 'lucide-react';


interface BillingUser {
    user_id: string;
    email: string;
    plan_name: string;
    status: string;
    usage: number;
    limit: number;
    usage_percent: number;
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

    const overLimitUsers = users.filter(u => u.usage > u.limit && u.limit > 0);
    const churnedUsers = users.filter(u => u.is_churned);
    const planCounts = stats?.plan_counts || {};

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-blue-500" />
                    Billing & Limits
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
                        Cash Register
                    </span>
                </h1>
                <p className="text-slate-500 mt-2">Monitor subscription usage, revenue, and churn.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <div className="bg-white/70 backdrop-blur border border-white/60 p-6 rounded-3xl shadow-lg shadow-blue-500/5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Estimated MRR</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                ${(stats?.mrr || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                            <CreditCard className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur border border-white/60 p-6 rounded-3xl shadow-lg shadow-blue-500/5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Total Active Subs</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {users.filter(u => u.status === 'active' && !u.is_churned).length}
                            </h3>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Plan Distribution */}
                <div className="bg-white/70 backdrop-blur border border-white/60 p-6 rounded-3xl shadow-lg shadow-blue-500/5">
                    <div className="flex items-start justify-between mb-2">
                         <p className="text-sm font-medium text-slate-500">Plan Distribution</p>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(planCounts).length === 0 ? (
                            <div className="text-sm text-slate-400">No data</div>
                        ) : (
                            Object.entries(planCounts).map(([plan, count]) => (
                                <div key={plan} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 font-medium">{plan}</span>
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">{count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur border border-white/60 p-6 rounded-3xl shadow-lg shadow-blue-500/5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Users Over Limit</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats?.over_limit || 0}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-2xl text-red-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur border border-white/60 p-6 rounded-3xl shadow-lg shadow-blue-500/5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Recent Cancellations</p>
                            <h3 className="text-3xl font-bold text-slate-800">{stats?.recent_churn_count || 0}</h3>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-2xl text-orange-500">
                            <Users className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Usage Table */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur border border-white/60 rounded-3xl shadow-xl shadow-blue-500/5 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800">Usage Monitor</h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3 w-1/3">Usage (Events)</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading metrics...</td></tr>
                                ) : users.map(user => (
                                    <tr key={user.user_id} className="hover:bg-white/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700">{user.email}</div>
                                            <div className="text-xs text-slate-400 font-mono">{user.user_id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                                                user.plan_name === 'Pro' ? 'bg-purple-100 text-purple-700' : 
                                                user.plan_name === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {user.plan_name}
                                            </span>
                                            {user.is_churned && <span className="ml-2 text-xs text-red-500 font-bold">(Cancelled)</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${
                                                            user.usage_percent > 100 ? 'bg-red-500' : 
                                                            user.usage_percent > 80 ? 'bg-orange-500' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${Math.min(user.usage_percent, 100)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold w-12 text-right ${
                                                    user.usage_percent > 100 ? 'text-red-600' : 'text-slate-600'
                                                }`}>
                                                    {user.usage_percent}%
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {user.usage.toLocaleString()} / {user.limit > 0 ? user.limit.toLocaleString() : '∞'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a 
                                                href={`mailto:${user.email}?subject=Usage%20Limit%20Alert`}
                                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                <Mail className="w-3 h-3" />
                                                Contact
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Churn & Alerts */}
                <div className="space-y-6">
                    {/* Over Limit Alert */}
                    {overLimitUsers.length > 0 && (
                        <div className="bg-red-50 border border-red-100 p-5 rounded-3xl">
                            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5" />
                                Critical Overages
                            </h3>
                            <div className="space-y-3">
                                {overLimitUsers.map(u => (
                                    <div key={u.user_id} className="bg-white/80 p-3 rounded-xl border border-red-100 flex justify-between items-center">
                                        <div className="overflow-hidden">
                                            <div className="font-medium text-red-900 truncate text-sm">{u.email}</div>
                                            <div className="text-xs text-red-600">{u.usage_percent}% of limit</div>
                                        </div>
                                        <button className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200">
                                            Throttle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Churn Watch */}
                    <div className="bg-white/70 backdrop-blur border border-white/60 p-5 rounded-3xl shadow-lg shadow-blue-500/5">
                        <h3 className="font-bold text-slate-800 mb-4">Recent Cancellations (30d)</h3>
                        {churnedUsers.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No recent churns! 🎉</p>
                        ) : (
                            <div className="space-y-3">
                                {churnedUsers.map(u => (
                                    <div key={u.user_id} className="group p-3 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-100 cursor-default">
                                        <div className="font-medium text-slate-700 text-sm truncate">{u.email}</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-slate-400">
                                                {u.churn_date ? new Date(u.churn_date).toLocaleDateString() : 'Recently'}
                                            </span>
                                            <a 
                                                href={`mailto:${u.email}?subject=Sad%20to%20see%20you%20go`}
                                                className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                                            >
                                                Ask Why
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
