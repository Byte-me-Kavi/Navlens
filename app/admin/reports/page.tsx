import React from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AdminReportGenerator from './AdminReportGenerator';

export default async function AdminReportsPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
               // Read only
            }
          },
        }
      );

    // Fetch all sites for the admin dropdown
    const { data: sites } = await supabase
        .from('sites')
        .select('id, domain, site_name, created_at')
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto max-w-6xl pb-20">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Report Generator</h1>
                <p className="text-slate-600">
                    Generate comprehensive PDF reports for any client site. 
                    Select a site below to configure the report parameters.
                </p>
            </div>

            <AdminReportGenerator sites={sites || []} />
        </div>
    );
}
