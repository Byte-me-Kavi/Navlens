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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10 max-w-4xl">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Account Settings</h1>
        <p className="text-gray-500 mt-2 text-lg">Manage your personal information, subscription, and preferences.</p>
      </div>

      {/* Tabs Layout - Fixed Spacing & Theme */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Nav */}
        <nav className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-8">
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl shadow-indigo-500/5 rounded-2xl p-4 space-y-2">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`
                            w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 group
                            ${isActive 
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20' 
                                : 'text-gray-600 hover:bg-white hover:text-indigo-600 hover:shadow-md hover:shadow-indigo-500/5'
                            }
                        `}
                    >
                        <tab.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                        {tab.label}
                    </button>
                )
            })}
          </div>
          
           {/* Account Summary Mini-Card (Future: Make dynamic) */}
           {/* <div className="mt-6 p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 hidden lg:block">
              <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider mb-1">Your Plan</p>
              <h3 className="text-lg font-bold">Pro Account</h3>
              <p className="text-xs text-indigo-100 mt-2 opacity-80">Next billing on Dec 29</p>
           </div> */}
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full">
             <div className="bg-white/40 backdrop-blur-sm border border-white/50 shadow-xl shadow-indigo-500/5 rounded-3xl p-1">
                 {activeTab === 'profile' && <ProfileTab />}
                 {activeTab === 'billing' && <BillingTab />}
                 {activeTab === 'settings' && <SettingsTab />}
             </div>
        </div>
      </div>
    </div>
  );
}
