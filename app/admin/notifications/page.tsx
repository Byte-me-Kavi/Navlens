
'use client';

import { useState, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  UserGroupIcon, 
  MegaphoneIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    audience: 'all', // all, plan, user
    targetValue: ''
  });

  useEffect(() => {
    // Fetch plans for dropdown
    fetch('/api/admin/users/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Sent to ${data.count} users`);
      setFormData({ ...formData, title: '', message: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 rounded-xl">
           <MegaphoneIcon className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Broadcast Center</h1>
           <p className="text-slate-500">Send notifications to your user base</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
           <h2 className="font-semibold text-slate-800">Compose Message</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
           {/* Audience Selection */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Target Audience</label>
                 <select 
                    value={formData.audience}
                    onChange={(e) => setFormData({...formData, audience: e.target.value})}
                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-700"
                 >
                    <option value="all">All Users</option>
                    <option value="plan">Specific Plan</option>
                    <option value="user">Specific User (ID)</option>
                 </select>
              </div>

              {formData.audience === 'plan' && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Plan</label>
                    <select 
                        value={formData.targetValue}
                        onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                        className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500"
                        required
                     >
                        <option value="">Choose a plan...</option>
                        {plans.map(p => (
                           <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                     </select>
                 </div>
              )}

              {formData.audience === 'user' && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">User ID (UUID)</label>
                    <input 
                        type="text"
                        value={formData.targetValue}
                        onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                        className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. 123e4567-e89b-..."
                        required
                    />
                 </div>
              )}
           </div>

           {/* Message Details */}
           <div className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Notification Type</label>
                 <div className="flex gap-4">
                    {['info', 'success', 'warning', 'error'].map(type => (
                       <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({...formData, type})}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border capitalize transition-all ${
                             formData.type === type 
                             ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-200' 
                             : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                       >
                          {type === 'info' && <InformationCircleIcon className="w-4 h-4" />}
                          {type === 'success' && <CheckCircleIcon className="w-4 h-4" />}
                          {type === 'warning' && <ExclamationTriangleIcon className="w-4 h-4" />}
                          {type === 'error' && <ExclamationTriangleIcon className="w-4 h-4" />}
                          {type}
                       </button>
                    ))}
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                 <input 
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Brief update summary"
                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500 h-10"
                    required
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Message Content</label>
                 <textarea 
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Enter your message here..."
                    className="w-full rounded-lg border-slate-200 focus:ring-2 focus:ring-indigo-500 h-32 py-3"
                    required
                 />
              </div>
           </div>

           <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-70"
              >
                 {loading ? 'sending...' : (
                    <>
                       <PaperAirplaneIcon className="w-5 h-5" />
                       Send Broadcast
                    </>
                 )}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}
