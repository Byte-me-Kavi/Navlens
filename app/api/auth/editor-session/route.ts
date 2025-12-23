/**
 * Editor Session Check API
 * 
 * Returns the current user's ID if logged into Navlens.
 * Used by ab-editor.js to verify the owner is accessing the editor.
 * GET /api/auth/editor-session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createPreflightResponse, addTrackerCorsHeaders, isOriginAllowed, getSiteDomain } from '@/lib/trackerCors';

export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    // Allow credentials for cross-origin session check
    const response = createPreflightResponse(origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    try {
        // Validate origin against site domain (if siteId provided)
        let isAllowed = true;
        if (siteId) {
            const siteInfo = await getSiteDomain(siteId);
            isAllowed = isOriginAllowed(origin, siteInfo.domain);
        }

        if (!isAllowed) {
            return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
        }

        // Get cookies from request
        const cookieStore = request.cookies;

        // Create Supabase client with cookies
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                    set(_name: string, _value: string, _options: CookieOptions) {
                        // Not needed for reading
                    },
                    remove(_name: string, _options: CookieOptions) {
                        // Not needed for reading
                    },
                },
            }
        );

        // Get current user session
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            // Not logged in
            const resp = NextResponse.json({ authenticated: false }, { status: 200 });
            resp.headers.set('Access-Control-Allow-Credentials', 'true');
            return addTrackerCorsHeaders(resp, origin, isAllowed);
        }

        // Return user ID (without sensitive info)
        const resp = NextResponse.json({
            authenticated: true,
            userId: user.id
        }, { status: 200 });
        resp.headers.set('Access-Control-Allow-Credentials', 'true');
        return addTrackerCorsHeaders(resp, origin, isAllowed);

    } catch (error: unknown) {
        console.error('[editor-session] Error:', error);
        const resp = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        resp.headers.set('Access-Control-Allow-Credentials', 'true');
        return addTrackerCorsHeaders(resp, origin, true);
    }
}
