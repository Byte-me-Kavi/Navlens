"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MagnifyingGlassIcon, ShieldCheckIcon, CreditCardIcon, MegaphoneIcon } from '@heroicons/react/24/outline'; // Re-import icons

// Define navigation
const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg> },
  { name: 'Billing', href: '/admin/billing', icon: CreditCardIcon },
  { name: 'Users', href: '/admin/users', icon: (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> },
  { name: 'Monitoring', href: '/admin/monitoring', icon: (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-1.25-3M3 6h18M3 10h18M3 14h18M4 18h16"></path></svg> },
  { name: 'Sites', href: '/admin/sites', icon: (props: any) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg> },
  { name: 'Audit Logs', href: '/admin/audit', icon: ShieldCheckIcon },
  { name: 'Notifications', href: '/admin/notifications', icon: MegaphoneIcon },
  { name: 'Inspector', href: '/admin/tools/inspector', icon: MagnifyingGlassIcon },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
      <aside className="w-64 bg-white/50 backdrop-blur-xl border-r border-white/50 p-6 hidden md:block z-10 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
           <span className="font-bold text-lg text-slate-800">Admin Dashboard</span>
        </div>
        
        <nav className="flex flex-col gap-2">
            {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.name}
                        href={item.href} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group ${
                            isActive 
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-slate-600 hover:bg-white/60 hover:text-blue-600'
                        }`}
                    >
                        <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-blue-500' : ''}`}>
                            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        {item.name}
                    </Link>
                );
            })}
        </nav>
      </aside>
    );
}
