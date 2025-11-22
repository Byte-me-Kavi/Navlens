"use client";

import {
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function SettingsPage() {
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

  // Fetch user data and preferences on mount
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

        // Fetch user preferences from database
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found");

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found");

      // Upsert notification preferences
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
        text:
          error instanceof Error ? error.message : "Failed to save preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
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
        text:
          error instanceof Error ? error.message : "Failed to send reset link",
      });
    }
  };
  return (
    <div className="space-y-5">
      {/* Toast Messages */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your account preferences and security
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-5">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <UserCircleIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">
              Profile Settings
            </h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address cannot be changed
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Your Name"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <BellIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-100">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 text-sm">
                Email notifications for new data
              </span>
            </label>
            <label className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-100">
              <input
                type="checkbox"
                checked={weeklyReports}
                onChange={(e) => setWeeklyReports(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 text-sm">
                Weekly analytics reports
              </span>
            </label>
            <label className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-100">
              <input
                type="checkbox"
                checked={productUpdates}
                onChange={(e) => setProductUpdates(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700 text-sm">
                Product updates and news
              </span>
            </label>
          </div>
          <button
            onClick={handleSaveNotifications}
            disabled={loading}
            className="mt-3 bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Security</h2>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleChangePassword}
              className="w-full text-left px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 text-sm"
            >
              <span className="font-medium text-blue-900">Change Password</span>
            </button>
            <button className="w-full text-left px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 cursor-not-allowed opacity-60 text-sm">
              <span className="font-medium text-blue-900">
                Two-Factor Authentication
              </span>
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
