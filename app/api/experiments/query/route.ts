/**
 * Experiments Query API (Secure POST)
 * 
 * POST endpoint for querying experiments with encrypted responses.
 * Params sent in body instead of URL for security.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCachedActiveExperiments } from '@/lib/experiments/cache';
import { getUserFromRequest } from '@/lib/auth';

import { secureCorsHeaders } from '@/lib/security';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: secureCorsHeaders(null),
    });
}

/**
 * POST /api/experiments/query
 * Query experiments with encrypted response
 */
export async function POST(request: NextRequest) {
    try {
        // Get params from body (secure)
        const body = await request.json();
        const { siteId, status, activeOnly } = body;

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400 }
            );
        }

        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify access
        const { data: site } = await supabaseAdmin
            .from('sites')
            .select('id, user_id')
            .eq('id', siteId)
            .single();

        if (!site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Fetch experiments
        if (activeOnly) {
            const experiments = await getCachedActiveExperiments(siteId, async () => {
                const { data, error } = await supabaseAdmin
                    .from('experiments')
                    .select('*')
                    .eq('site_id', siteId)
                    .eq('status', 'running')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                return data || [];
            });

            return NextResponse.json({ experiments });
        }

        // Query with optional status filter
        let query = supabaseAdmin
            .from('experiments')
            .select('*')
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: experiments, error } = await query;

        if (error) {
            console.error('[experiments/query] Error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch experiments' },
                { status: 500 }
            );
        }

        return NextResponse.json({ experiments: experiments || [] });

    } catch (error: unknown) {
        console.error('[experiments/query] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
