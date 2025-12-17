/**
 * Editor URL Verification API
 * 
 * Validates signed editor URLs server-side before allowing editor access.
 * POST /api/experiments/verify-editor
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEditorSignature } from '@/lib/experiments/editor-security';
import { createPreflightResponse, addTrackerCorsHeaders, isOriginAllowed, getSiteDomain } from '@/lib/trackerCors';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return createPreflightResponse(origin);
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { experimentId, variantId, timestamp, signature } = await request.json();

        // Validate required params
        if (!experimentId || !variantId || !timestamp || !signature) {
            const resp = NextResponse.json({ valid: false, error: 'Missing required parameters' }, { status: 400 });
            return addTrackerCorsHeaders(resp, origin, true);
        }

        // Get the experiment's site to validate origin
        const { data: experiment } = await supabase
            .from('experiments')
            .select('site_id')
            .eq('id', experimentId)
            .single();

        if (!experiment) {
            const resp = NextResponse.json({ valid: false, error: 'Experiment not found' }, { status: 404 });
            return addTrackerCorsHeaders(resp, origin, true);
        }

        // Validate origin against site domain
        const siteInfo = await getSiteDomain(experiment.site_id);
        const isAllowed = isOriginAllowed(origin, siteInfo.domain);

        if (!isAllowed) {
            console.warn(`[verify-editor] Origin ${origin} not allowed for site ${experiment.site_id}`);
            // Don't set CORS headers - browser will block
            return NextResponse.json({ valid: false, error: 'Origin not allowed' }, { status: 403 });
        }

        // Validate signature using server-side secret
        const result = validateEditorSignature(experimentId, variantId, timestamp, signature);

        if (!result.valid) {
            console.warn('[verify-editor] Invalid signature attempt:', {
                experimentId,
                variantId,
                error: result.error
            });
            const resp = NextResponse.json({ valid: false, error: result.error }, { status: 403 });
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        // Signature is valid
        const resp = NextResponse.json({ valid: true }, { status: 200 });
        return addTrackerCorsHeaders(resp, origin, isAllowed);

    } catch (error) {
        console.error('[verify-editor] Error:', error);
        const resp = NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
        return addTrackerCorsHeaders(resp, origin, true);
    }
}
