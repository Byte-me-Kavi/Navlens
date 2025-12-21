import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import AdminSidebar from './components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session) {
    redirect('/sys-secure-entry-x92');
  }

  return (

    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-900 relative">
       {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-indigo-300/10 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <AdminSidebar />
      
      <main className="flex-1 p-8 z-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
