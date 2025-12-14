/**
 * Editor URL API
 * 
 * Generates signed URLs for the visual editor.
 * POST /api/experiments/editor-url
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';
import { generateEditorUrl } from '@/lib/experiments/editor-security';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        const { experimentId, siteId, variantId } = await request.json();

        if (!experimentId || !siteId || !variantId) {
            return NextResponse.json(
                { error: 'experimentId, siteId, and variantId are required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Verify user owns the site
        const { data: site } = await supabaseAdmin
            .from('sites')
            .select('domain, user_id')
            .eq('id', siteId)
            .single();

        if (!site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403, headers: corsHeaders(origin) }
            );
        }

        // Generate signed URL
        const siteUrl = site.domain.startsWith('http')
            ? site.domain
            : `https://${site.domain}`;

        const editorUrl = generateEditorUrl(siteUrl, experimentId, variantId);

        return NextResponse.json(
            {
                url: editorUrl,
                expiresIn: '1 hour'
            },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error) {
        console.error('[editor-url] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
