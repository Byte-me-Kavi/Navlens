"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { secureClient } from '@/lib/secure-client';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';


export default function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [otp, setOtp] = useState('');
  
  const router = useRouter();

  // Check block status on mount
  React.useEffect(() => {
     const checkStatus = async () => {
         try {
             const res = await fetch('/api/admin/status');
             const data = await res.json();
             if (data.blocked) {
                 setBlocked(true);
             }
         } catch (e) {
             console.error('Failed to check status', e);
         }
     };
     checkStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await secureClient.post<{ success: boolean; redirectUrl?: string; blocked?: boolean }>('/admin/auth', {
        email,
        password
      });

      if (response.success) {
        router.push(response.redirectUrl || '/admin/dashboard');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      const isBlocked = err.response?.data?.blocked || err.message?.includes('blocked');
      
      if (isBlocked) {
          setBlocked(true);
          setError('Security Lockout Active.');
      } else {
          setError(err.message || 'Login failed. Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
          const res = await fetch('/api/admin/unlock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ otp })
          });
          const data = await res.json();

          if (res.ok) {
              setBlocked(false);
              setOtp('');
              setError('');
              // Alert removed for stealth
          } else {
              setError(data.error || 'Unlock failed');
          }
      } catch (_err) {
          setError('Failed to process unlock request');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/30 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-indigo-300/20 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-2xl p-8 z-10 shadow-xl shadow-blue-900/5"
      >
        <div className="flex justify-center mb-8">
          <div className={`p-4 rounded-2xl shadow-lg transition-colors ${blocked ? 'bg-red-500 shadow-red-500/20' : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/20'}`}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {blocked ? 'Security Lockout' : 'Restricted Access'}
        </h1>
        <p className="text-slate-500 text-center mb-8 text-sm">
            {blocked ? 'Enter Security Code' : 'Secure Admin Portal'}
        </p>

        {!blocked ? (
            <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Identifier</label>
                <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Enter admin identifier"
                required
                />
            </div>
            
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Passkey</label>
                <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                placeholder="Enter secure passkey"
                required
                />
            </div>

            {error && (
                <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100"
                >
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
                </motion.div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
                {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                <>
                    <span>Authenticate</span>
                    <ArrowRight className="w-4 h-4" />
                </>
                )}
            </button>
            </form>
        ) : (
            <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Security Code</label>
                <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-white/50 border border-red-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-center tracking-[0.5em] font-mono text-lg"
                    placeholder="••••••"
                    maxLength={6}
                    required
                />
                </div>

                 {error && (
                    <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100"
                    >
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                    </motion.div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-500 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                    {loading ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                    <span>Unlock Access</span>
                    )}
                </button>
            </form>
        )}

        <div className="mt-8 text-center flex items-center justify-center gap-2 text-slate-400">
            <Lock className="w-3 h-3" />
            <p className="text-xs font-medium">
                End-to-end encrypted connection
            </p>
        </div>
      </motion.div>
    </div>
  );
}
