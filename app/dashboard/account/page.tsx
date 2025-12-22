"use client";

import { useState } from "react";
import { 
    UserCircleIcon, 
    CreditCardIcon, 
    Cog6ToothIcon 
} from "@heroicons/react/24/outline";
import { ProfileTab } from "./components/ProfileTab";
import { BillingTab } from "./components/BillingTab";
import { SettingsTab } from "./components/SettingsTab";

type Tab = 'profile' | 'billing' | 'settings';

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs = [
    { id: 'profile', label: 'Profile & Security', icon: UserCircleIcon },
    { id: 'billing', label: 'Billing & History', icon: CreditCardIcon },
    { id: 'settings', label: 'App Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="w-full px-4 sm:px-3 lg:px-2 py-2">
      {/* Header */}
      <div className="mb-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 mt-2 text-lg">Manage your personal information, subscription, and preferences.</p>
      </div>

      {/* Tabs Layout - Fixed Spacing & Theme */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Nav */}
        <nav className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-2 space-y-1">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 group
                            ${isActive 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                        `}
                    >
                        <tab.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                        {tab.label}
                    </button>
                )
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full">
             {/* No container wrapper needed here, tabs handle their own containers */}
             <div className="space-y-6">
                 {activeTab === 'profile' && <ProfileTab />}
                 {activeTab === 'billing' && <BillingTab />}
                 {activeTab === 'settings' && <SettingsTab />}
             </div>
        </div>
      </div>
    </div>
  );
}
