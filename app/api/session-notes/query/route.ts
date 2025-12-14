/**
 * Session Notes Query API (Secure POST)
 * 
 * POST endpoint for querying session notes with encrypted responses.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';
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
 * POST /api/session-notes/query
 * Query session notes with encrypted response
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, siteId } = body;

        if (!sessionId || !siteId) {
            return encryptedJsonResponse(
                { error: 'sessionId and siteId are required' },
                { status: 400 }
            );
        }

        // Authenticate
        const user = await getUserFromRequest(request);
        if (!user) {
            return encryptedJsonResponse(
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
            return encryptedJsonResponse(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // Fetch notes
        const { data: notes, error } = await supabaseAdmin
            .from('session_notes')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[session-notes/query] Error:', error);
            return encryptedJsonResponse(
                { error: 'Failed to fetch notes' },
                { status: 500 }
            );
        }

        return encryptedJsonResponse({ notes: notes || [] });

    } catch (error) {
        console.error('[session-notes/query] Error:', error);
        return encryptedJsonResponse(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
