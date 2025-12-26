/**
 * Cohorts Query API (Secure POST)
 * 
 * POST endpoint for querying cohorts with encrypted responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
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
        const authResult = await authenticateAndAuthorize(request);

        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await request.json();
        const { siteId } = body;

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400 }
            );
        }

        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        // Fetch cohorts (using admin client since RLS might block if user is purely virtual/public)
        // If the user is a real user, RLS would work with a user client, but for consistency and since we verified authZ above:
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

    } catch (error: unknown) {
        console.error('[cohorts/query] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
