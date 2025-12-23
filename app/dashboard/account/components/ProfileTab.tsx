"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export function ProfileTab() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [productUpdates, setProductUpdates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
            setEmail(session.user.email);
            setDisplayName(session.user.user_metadata?.full_name || "");
        }

        const { data: prefs, error } = await supabase
          .from("user_preferences")
          .select("*")
          .single();

        if (!error && prefs) {
          setEmailNotifications(prefs.email_notifications ?? true);
          setWeeklyReports(prefs.weekly_reports ?? true);
          setProductUpdates(prefs.product_updates ?? false);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [supabase]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });

      if (error) throw error;
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase.from("user_preferences").upsert(
        {
            user_id: user.id,
            email_notifications: emailNotifications,
            weekly_reports: weeklyReports,
            product_updates: productUpdates,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
      setMessage({ type: "success", text: "Notification preferences saved!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/account`,
      });

      if (error) throw error;
      setMessage({
        type: "success",
        text: "Password reset link sent to your email!",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to send reset link",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium shadow-sm border ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Grid Layout for Profile & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-50 rounded-xl">
                <UserCircleIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500">Update your personal details</p>
            </div>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm font-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all bg-white"
                placeholder="Your Name"
              />
            </div>
            <div className="pt-4">
                <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                {loading ? "Saving..." : "Save Changes"}
                </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 h-fit">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-50 rounded-xl">
                <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900">Security</h2>
                <p className="text-sm text-gray-500">Manage password and authentication</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">New Password</label>
                        <input 
                            type="password" 
                            name="new_password" // Specific name to avoid browser autofill confusion
                            autoComplete="new-password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            id="new-password-input"
                        />
                    </div>
                    <div>
                        <button
                            onClick={async () => {
                                const input = document.getElementById('new-password-input') as HTMLInputElement;
                                const newPassword = input.value;
                                if (!newPassword) return setMessage({ type: 'error', text: 'Please enter a password' });
                                if (newPassword.length < 6) return setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
                                
                                setLoading(true);
                                try {
                                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                                    if (error) throw error;
                                    setMessage({ type: 'success', text: 'Password updated successfully!' });
                                    input.value = '';
                                } catch (e: any) {
                                    setMessage({ type: 'error', text: e.message });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl opacity-75">
               <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Two-Factor Auth</span>
                  <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Soon
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
                <BellIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-base font-bold text-gray-900">Notifications</h2>
                <p className="text-xs text-gray-500">Manage email preferences</p>
            </div>
        </div>

        <div className="space-y-3 max-w-2xl">
          <label className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Email notifications for new data</span>
            <div className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
            </div>
          </label>

          <label className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Weekly analytics reports</span>
            <div className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={weeklyReports}
                    onChange={(e) => setWeeklyReports(e.target.checked)}
                    className="sr-only peer"
                />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
            </div>
          </label>

          <label className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all group">
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Product updates and news</span>
            <div className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={productUpdates}
                    onChange={(e) => setProductUpdates(e.target.checked)}
                    className="sr-only peer"
                />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:border-white"></div>
            </div>
          </label>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
            <button
            onClick={handleSaveNotifications}
            disabled={loading}
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all disabled:opacity-50"
            >
            {loading ? "Saving..." : "Save Preferences"}
            </button>
        </div>
      </div>
    </div>
  );
}
