/**
 * Cohorts Query API (Secure POST)
 * 
 * POST endpoint for querying cohorts with encrypted responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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
 * POST /api/cohorts/query
 * Query cohorts with encrypted response
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteId } = body;

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400 }
            );
        }

        // Authenticate
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
            .select('user_id')
            .eq('id', siteId)
            .single();

        if (!site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Fetch cohorts
        const { data: cohorts, error } = await supabaseAdmin
            .from('cohorts')
            .select('*')
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[cohorts/query] Error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch cohorts' },
                { status: 500 }
            );
        }

        return NextResponse.json({ cohorts: cohorts || [] });

    } catch (error) {
        console.error('[cohorts/query] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
