
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-admin';
import { withMonitoring } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[AdminPlans] Fetching plans...');
        // Check env vars explicitly
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[AdminPlans] Missing SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Server misconfiguration: Missing Key' }, { status: 500 });
        }

        const supabase = createClient();
        console.log('[AdminPlans] Client created. Querying...');

        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*');

        if (error) {
            console.error('[AdminPlans] DB Error:', error);
            throw error;
        }

        console.log(`[AdminPlans] Found ${data?.length || 0} plans`);
        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('[AdminPlans] Critical Error:', error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
