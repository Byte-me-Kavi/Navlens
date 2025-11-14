"use client";

import {
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account preferences and security
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <UserCircleIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-blue-900">
              Profile Settings
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Name"
              />
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
              Save Changes
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <BellIcon className="w-6 h-6 text-cyan-600" />
            <h2 className="text-xl font-bold text-blue-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-100">
              <input type="checkbox" className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">
                Email notifications for new data
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-100">
              <input type="checkbox" className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Weekly analytics reports</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-100">
              <input type="checkbox" className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Product updates and news</span>
            </label>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-blue-900">Security</h2>
          </div>
          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100">
              <span className="font-medium text-blue-900">Change Password</span>
            </button>
            <button className="w-full text-left px-4 py-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100">
              <span className="font-medium text-blue-900">
                Two-Factor Authentication
              </span>
              <span className="ml-2 text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                Coming Soon
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
