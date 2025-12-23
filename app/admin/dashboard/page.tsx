
"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, Globe, MousePointer, Search, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DashboardStats {
    totalUsers: number;
    totalSites: number;
    totalEvents: number;
    recentSignups: { id: string, email: string, created_at: string, status: string }[];
    eventsChart: { date: string, count: number }[];
    planDistribution: { name: string, value: number }[];
    systemHealth: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']; // Blue, Purple, Emerald, Amber, Red

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error('Failed to fetch admin stats', e);
        } finally {
            setLoading(false);
        }
    };
    fetchStats();
  }, []);

  const stats = [
    { 
        label: 'Total Users', 
        value: loading ? '...' : data?.totalUsers.toLocaleString(), 
        icon: Users, 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10' 
    },
    { 
        label: 'Total Sites', 
        value: loading ? '...' : data?.totalSites.toLocaleString(), 
        icon: Globe, 
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10' 
    },
    { 
        label: 'Total Events', 
        value: loading ? '...' : data?.totalEvents.toLocaleString(), 
        icon: MousePointer, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10' 
    },
    { 
        label: 'System Status', 
        value: loading ? '...' : data?.systemHealth || 'Unknown', 
        icon: Activity, 
        color: data?.systemHealth === 'Healthy' ? 'text-green-500' : data?.systemHealth === 'Degraded' ? 'text-orange-500' : 'text-red-500', 
        bg: data?.systemHealth === 'Healthy' ? 'bg-green-500/10' : data?.systemHealth === 'Degraded' ? 'bg-orange-500/10' : 'bg-red-500/10' 
    },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back, Administrator.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-2xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-xl shadow-blue-500/5 hover:bg-white/80 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ring-1 ring-inset ring-black/5`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1 text-slate-800">{stat.value}</div>
            <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Admin Tools Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <a href="/admin/tools/inspector" className="block group">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Search className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Script Inspector</h3>
                        <p className="text-sm text-gray-500 mt-1">Debug installation issues.</p>
                    </div>
                </div>
            </div>
        </a>

        <a href="/admin/audit" className="block group">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-300">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Audit Logs</h3>
                        <p className="text-sm text-gray-500 mt-1">View tracking history.</p>
                    </div>
                </div>
            </div>
        </a>

        <a href="/admin/users" className="block group">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-purple-300">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">Manage Users</h3>
                        <p className="text-sm text-gray-500 mt-1">Bans & Plan Overrides.</p>
                    </div>
                </div>
            </div>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Section */}
        <div className="p-8 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-xl shadow-blue-500/5 h-96 transition-all hover:shadow-blue-500/10 flex flex-col">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500"/>
                Event Activity (30 Days)
            </h3>
            
            <div className="flex-1 w-full relative">
                {/* Y-Axis High/Low Labels */}
                {data?.eventsChart && data.eventsChart.length > 0 && (
                    <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400 font-medium pointer-events-none z-0 py-6">
                         <div className="border-b border-slate-100 w-full h-0 relative">
                            <span className="absolute -top-3 left-0">
                                {Math.max(...data.eventsChart.map(d => d.count), 1).toLocaleString()}
                            </span>
                         </div>
                         <div className="border-b border-dashed border-slate-100 w-full h-0 opacity-50" />
                         <div className="border-b border-slate-100 w-full h-0 relative">
                             <span className="absolute -bottom-5 left-0">0</span>
                         </div>
                    </div>
                )}

                <div className="absolute inset-0 flex items-end justify-between gap-1 pl-8 py-6 z-10 text-xs">
                    {loading ? (
                        <div className="w-full text-center text-slate-400 self-center">Loading chart...</div>
                    ) : data?.eventsChart && data.eventsChart.length > 0 ? (
                        data.eventsChart.map((item, idx) => {
                            const max = Math.max(...data.eventsChart.map(d => d.count), 1);
                            const height = (item.count / max) * 100;
                            return (
                                <div key={idx} className="group relative flex flex-col items-center flex-1 h-full justify-end">
                                    <div 
                                        className="w-full max-w-[12px] bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm opacity-60 group-hover:opacity-100 transition-all hover:scale-y-105 origin-bottom"
                                        style={{ height: `${height}%`, minHeight: '4px' }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-xl">
                                        {new Date(item.date).toLocaleDateString()} : {item.count}
                                    </div>
                                    {/* X-Axis Date Label (Sparse) */}
                                    {idx % 5 === 0 && (
                                        <div className="absolute top-full mt-2 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                            {new Date(item.date).getDate()}/{new Date(item.date).getMonth() + 1}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="w-full text-center text-slate-400 self-center">No recent activity data</div>
                    )}
                </div>
            </div>
        </div>

        {/* Plan Distribution Chart */}
        <div className="p-8 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-xl shadow-blue-500/5 h-96 transition-all hover:shadow-blue-500/10 flex flex-col">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500"/>
                User Plan Distribution
            </h3>
            <div className="flex-1 w-full min-h-0">
                {loading ? (
                     <div className="w-full h-full flex items-center justify-center text-slate-400">Loading distribution...</div>
                ) : data?.planDistribution && data.planDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.planDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.planDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: 'white' }}
                                itemStyle={{ color: 'white' }}
                                formatter={(value: number | undefined) => [value, 'Users']}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">No plan data</div>
                )}
            </div>
        </div>

         {/* Recent Signups Section - Spanning Full Width */}
         <div className="p-8 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-xl shadow-blue-500/5 h-96 transition-all hover:shadow-blue-500/10 overflow-hidden flex flex-col lg:col-span-2">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500"/>
                Recent Signups
            </h3>
             <div className="space-y-4 overflow-y-auto pr-2 flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-200">
                {loading ? (
                    <div className="text-slate-400 text-sm text-center">Loading signups...</div>
                ) : data?.recentSignups && data.recentSignups.length > 0 ? (
                    data.recentSignups.map((user) => (
                        <div key={user.id} className="flex items-center gap-4 text-sm p-4 bg-white/50 rounded-2xl border border-white/50 hover:bg-white hover:border-purple-100 hover:shadow-lg hover:shadow-purple-500/5 transition-all cursor-pointer group">
                            <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-700 font-medium group-hover:text-blue-700 transition-colors truncate max-w-[180px]">
                                    {user.email}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-lg ${user.status === 'Active' ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
                                {user.status}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-slate-400 text-sm italic">No recent signups found.</div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
}
