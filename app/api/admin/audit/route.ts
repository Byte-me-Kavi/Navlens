
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-admin';
import { withMonitoring } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

async function GET_handler() {
    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            // Table might not exist yet if migration wasn't run
            if (error.code === '42P01') { // undefined_table
                return NextResponse.json({ logs: [] });
            }
            throw error;
        }

        return NextResponse.json({ logs: data });
    } catch (error: any) {
        console.error('[AdminAudit] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const GET = withMonitoring(GET_handler);
