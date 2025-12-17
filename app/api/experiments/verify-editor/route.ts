/**
 * Editor URL Verification API
 * 
 * Validates signed editor URLs server-side before allowing editor access.
 * Uses one-time tokens to prevent link reuse.
 * Verifies the user's session matches the token owner.
 * POST /api/experiments/verify-editor
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEditorSignature } from '@/lib/experiments/editor-security';
import { createPreflightResponse, addTrackerCorsHeaders, isOriginAllowed, getSiteDomain } from '@/lib/trackerCors';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    const response = createPreflightResponse(origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { experimentId, variantId, timestamp, token, signature } = await request.json();

        // Validate required params
        if (!experimentId || !variantId || !timestamp || !token || !signature) {
            const resp = NextResponse.json({ valid: false, error: 'Missing required parameters' }, { status: 400 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, true);
        }

        // Get the experiment's site to validate origin
        const { data: experiment } = await supabaseAdmin
            .from('experiments')
            .select('site_id')
            .eq('id', experimentId)
            .single();

        if (!experiment) {
            const resp = NextResponse.json({ valid: false, error: 'Experiment not found' }, { status: 404 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, true);
        }

        // Validate origin against site domain
        const siteInfo = await getSiteDomain(experiment.site_id);
        const isAllowed = isOriginAllowed(origin, siteInfo.domain);

        if (!isAllowed) {
            console.warn(`[verify-editor] Origin ${origin} not allowed for site ${experiment.site_id}`);
            return NextResponse.json({ valid: false, error: 'Origin not allowed' }, { status: 403 });
        }

        // Validate signature using server-side secret (includes token in signature)
        const result = validateEditorSignature(experimentId, variantId, timestamp, token, signature);

        if (!result.valid) {
            console.warn('[verify-editor] Invalid signature attempt:', { experimentId, variantId, error: result.error });
            const resp = NextResponse.json({ valid: false, error: result.error }, { status: 403 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        // Check if token was already used (one-time use) and get user_id
        const { data: existingToken } = await supabaseAdmin
            .from('editor_tokens')
            .select('id, used, user_id')
            .eq('token', token)
            .single();

        if (!existingToken) {
            console.warn('[verify-editor] Token not found in database:', token);
            const resp = NextResponse.json({ valid: false, error: 'Invalid or expired token' }, { status: 403 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        if (existingToken.used) {
            console.warn('[verify-editor] Token already used:', token);
            const resp = NextResponse.json({ valid: false, error: 'This link has already been used. Please generate a new link.' }, { status: 403 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        // CRITICAL: Verify the current user's session matches the token owner
        const cookieStore = request.cookies;
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                    set() { },
                    remove() { },
                },
            }
        );

        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            console.warn('[verify-editor] User not authenticated');
            const resp = NextResponse.json({
                valid: false,
                error: 'You must be logged into Navlens to access the editor. Please log in and try again.',
                requiresAuth: true
            }, { status: 401 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        if (user.id !== existingToken.user_id) {
            console.warn('[verify-editor] User mismatch:', { sessionUserId: user.id, tokenUserId: existingToken.user_id });
            const resp = NextResponse.json({
                valid: false,
                error: 'This editor link was generated by a different user. Only the site owner can access the editor.'
            }, { status: 403 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        // Mark token as used (one-time use)
        await supabaseAdmin
            .from('editor_tokens')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('token', token);

        console.log('[verify-editor] Token verified for user:', user.id);

        // Signature is valid, token is fresh, and user is authorized
        const resp = NextResponse.json({ valid: true }, { status: 200 });
        resp.headers.set('Access-Control-Allow-Credentials', 'true');
        return addTrackerCorsHeaders(resp, origin, isAllowed);

    } catch (error) {
        console.error('[verify-editor] Error:', error);
        const resp = NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
        resp.headers.set('Access-Control-Allow-Credentials', 'true');
        return addTrackerCorsHeaders(resp, origin, true);
    }
}


