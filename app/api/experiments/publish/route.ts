/**
 * Publish API
 * 
 * Manually trigger publishing of experiment config to Supabase Storage.
 * Also called automatically when experiments are started/stopped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';
import { publishSiteConfig, ensureStorageBucket } from '@/lib/experiments/publisher';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS headers
function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

/**
 * POST /api/experiments/publish
 * Publish site config to CDN storage
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        // Authenticate
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        const body = await request.json();
        const { siteId } = body;

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Verify user has access to site
        const { data: site } = await supabaseAdmin
            .from('sites')
            .select('user_id')
            .eq('id', siteId)
            .single();

        if (!site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403, headers: corsHeaders(origin) }
            );
        }

        // Ensure storage bucket exists
        await ensureStorageBucket();

        // Publish config
        const result = await publishSiteConfig(siteId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to publish' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Config published to CDN' },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error: unknown) {
        console.error('[publish] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
