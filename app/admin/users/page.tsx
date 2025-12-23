"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Ban, CheckCircle, Clock, X, AlertOctagon, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
    id: string;
    email: string;
    created_at: string;
    last_sign_in: string;
    banned_until?: string;
    is_banned: boolean;
    plan_name: string;
    sites_count: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showBanModal, setShowBanModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            console.log('[UsersPage] Fetching users...');
            const res = await fetch('/api/admin/users?perPage=100');
            console.log('[UsersPage] Status:', res.status);
            const data = await res.json();
            console.log('[UsersPage] Data:', data);
            
            if (data.users) {
                setUsers(data.users);
            } else if (data.error) {
                toast.error('Error: ' + data.error);
            }
        } catch (error) {
            console.error('[UsersPage] Error:', error);
            toast.error('Failed to load users');
        } finally {
            console.log('[UsersPage] Loading done.');
            setLoading(false);
        }
    };

    // Load subscription plans for dropdown
    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/users/plans');
            const data = await res.json();
            if (Array.isArray(data)) {
                // Sort plans: Free, Starter, Pro, Enterprise
                const order = ['Free', 'Starter', 'Pro', 'Enterprise'];
                const sorted = data.sort((a, b) => {
                    const indexA = order.indexOf(a.name);
                    const indexB = order.indexOf(b.name);
                    // If not found in order list, put at end
                    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                });
                setPlans(sorted);
            }
        } catch {
            console.error('Failed to fetch plans');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchPlans();
        // Failsafe
        const timer = setTimeout(() => setLoading(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Confirmation Modal State
    const [confirmAction, setConfirmAction] = useState<{ 
        type: 'plan' | 'ban', 
        targetId?: string, // planId or banType
        msg: string 
    } | null>(null);

    const handlePlanChangeClick = (planId: string) => {
        const planName = plans.find(p => p.id === planId)?.name;
        setConfirmAction({
            type: 'plan',
            targetId: planId,
            msg: `Are you sure you want to change the user's plan to ${planName}? This will override their current subscription.`
        });
    };

    const handleBanActionClick = (action: '24h' | '7d' | 'forever' | 'unban') => {
        let msg = '';
        if (action === 'unban') msg = 'Are you sure you want to restore access for this user?';
        else if (action === 'forever') msg = 'Are you sure you want to PERMANENTLY ban this user?';
        else msg = `Are you sure you want to ban this user for ${action === '24h' ? '24 hours' : '7 days'}?`;

        setConfirmAction({
            type: 'ban',
            targetId: action,
            msg
        });
    };

    const executeAction = async () => {
        if (!confirmAction || !selectedUser) return;
        setProcessing(true);

        if (confirmAction.type === 'plan') {
            await updatePlan(confirmAction.targetId!);
        } else if (confirmAction.type === 'ban') {
            await updateBan(confirmAction.targetId as '24h' | '7d' | 'forever' | 'unban');
        }
        
        setConfirmAction(null);
        setProcessing(false);
    };

    const updatePlan = async (planId: string) => {
        console.log('Changing plan to:', planId);
        try {
            const res = await fetch('/api/admin/users/update-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser!.id, planId })
            });
            const data = await res.json();
            
            if (res.ok) {
                toast.success('Plan Updated Successfully');
                // Update local state
                const newPlanName = plans.find(p => p.id === planId)?.name || 'Unknown';
                setUsers(prev => prev.map(u => 
                    u.id === selectedUser!.id ? { ...u, plan_name: newPlanName } : u
                ));
                setSelectedUser(prev => prev ? { ...prev, plan_name: newPlanName } : null);
            } else {
                console.error('Update plan failed:', data);
                toast.error(data.error || 'Failed to update plan. Check console.');
            }
        } catch (e: unknown) {
            console.error('Network error:', e);
            if (e instanceof Error) {
                toast.error('Network error: ' + e.message);
            } else {
                toast.error('Network error');
            }
        }
    };

    const updateBan = async (action: '24h' | '7d' | 'forever' | 'unban') => {
        try {
            const res = await fetch(`/api/admin/users/${selectedUser!.id}/ban`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(action === 'unban' ? 'User Access Restored' : 'User Banned Successfully');
                // Refresh list locally to update UI instantly
                setUsers(prev => prev.map(u => 
                    u.id === selectedUser!.id ? { 
                        ...u, 
                        banned_until: data.user.banned_until,
                        is_banned: action !== 'unban' 
                    } : u
                ));
                setShowBanModal(false);
                setSelectedUser(null);
            } else {
                toast.error(data.error || 'Action failed');
            }
        } catch {
            toast.error('Network error');
        }
    };

    const filteredUsers = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.id.includes(searchTerm)
    );

    return (
        <div>
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Users className="w-8 h-8 text-blue-500" />
                        User Management
                    </h1>
                    <p className="text-slate-500">View and manage platform users.</p>
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/70 backdrop-blur border border-white/50 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </header>

            {/* Users Table Card */}
            <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-xl shadow-blue-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Sites</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Ordered</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/60 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                                    {user.email?.[0] || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-700 font-medium">{user.email}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{user.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                user.plan_name === 'Pro' ? 'bg-purple-100 text-purple-700' :
                                                user.plan_name === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {user.plan_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                             <a href={`/admin/sites?userId=${user.id}`} className="text-sm font-bold text-blue-600 hover:underline hover:text-blue-700 transition-colors">
                                                {user.sites_count} Sites
                                             </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_banned ? (
                                                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                                                    <Ban className="w-3 h-3" />
                                                    Banned
                                                 </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowBanModal(true);
                                                }}
                                                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors shadow-sm"
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ban Management Modal */}
            <AnimatePresence>
                {showBanModal && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
                            onClick={() => !confirmAction && setShowBanModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative z-10 border border-white/50"
                        >
                            {!confirmAction && (
                                <button 
                                    onClick={() => setShowBanModal(false)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}

                            {confirmAction ? (
                                <div className="text-center py-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                                        <AlertOctagon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Action</h3>
                                    <p className="text-slate-600 mb-6">{confirmAction.msg}</p>
                                    
                                    <div className="flex gap-3 justify-center">
                                        <button 
                                            onClick={() => setConfirmAction(null)}
                                            className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                                            disabled={processing}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={executeAction}
                                            disabled={processing}
                                            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                                        >
                                            {processing ? 'Processing...' : 'Confirm'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-slate-800 mb-1">Manage Access</h2>
                                        <p className="text-sm text-slate-500">Control access for <span className="font-semibold text-slate-700">{selectedUser.email}</span></p>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Plan Management Section */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Subscription Plan</h3>
                                            <div className="flex gap-2">
                                                {plans.map(plan => (
                                                    <button
                                                        key={plan.id}
                                                        disabled={processing || selectedUser.plan_name === plan.name}
                                                        onClick={() => handlePlanChangeClick(plan.id)}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                                                            selectedUser.plan_name === plan.name
                                                                ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500/20'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                                                        }`}
                                                    >
                                                        {plan.name}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                Manually assigning a plan will override billing status.
                                            </p>
                                        </div>

                                        {/* Ban Section */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">Access Control</h3>
                                            {selectedUser.is_banned ? (
                                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                                                    <div className="flex items-start gap-3">
                                                        <AlertOctagon className="w-5 h-5 text-red-500 mt-0.5" />
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-red-700">User is Banned</h3>
                                                            <p className="text-xs text-red-600 mt-1">
                                                                Access is restricted until {selectedUser.banned_until ? new Date(selectedUser.banned_until).toLocaleDateString() : 'Forever'}.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    disabled={processing}
                                                    onClick={() => handleBanActionClick('24h')}
                                                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock className="w-4 h-4 text-orange-500" />
                                                        <span className="font-semibold text-slate-700 text-sm">24 Hours</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500 group-hover:text-orange-600">Temporary timeout</span>
                                                </button>

                                                <button
                                                    disabled={processing}
                                                    onClick={() => handleBanActionClick('7d')}
                                                    className="p-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock className="w-4 h-4 text-orange-500" />
                                                        <span className="font-semibold text-slate-700 text-sm">7 Days</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500 group-hover:text-orange-600">One week suspension</span>
                                                </button>

                                                <button
                                                    disabled={processing}
                                                    onClick={() => handleBanActionClick('forever')}
                                                    className="p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all text-left group col-span-2"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <UserX className="w-4 h-4 text-red-500" />
                                                        <span className="font-semibold text-slate-700 text-sm">Permanent Ban</span>
                                                    </div>
                                                    <span className="text-xs text-slate-500 group-hover:text-red-600">Revoke access indefinitely</span>
                                                </button>
                                            </div>

                                            {selectedUser.is_banned && (
                                                <button
                                                    disabled={processing}
                                                    onClick={() => handleBanActionClick('unban')}
                                                    className="w-full mt-4 bg-slate-900 text-white rounded-xl py-3 font-semibold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                                                >
                                                    Restore Access
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
