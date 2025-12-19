/**
 * Supabase Server Client with Service Role
 * Use ONLY for server-side operations that require bypassing RLS
 * NEVER expose this to the client
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceRole) {
        throw new Error('Missing Supabase service role credentials');
    }

    return createSupabaseClient(supabaseUrl, supabaseServiceRole, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
