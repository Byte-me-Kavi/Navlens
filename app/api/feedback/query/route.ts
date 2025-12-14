/**
 * Feedback Query API (Secure POST)
 * 
 * POST endpoint for querying feedback with encrypted responses.
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
 * POST /api/feedback/query
 * Query feedback with encrypted response
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteId, limit = 50, offset = 0 } = body;

        if (!siteId) {
            return encryptedJsonResponse(
                { error: 'siteId is required' },
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

        // Fetch feedback
        const { data: feedback, error, count } = await supabaseAdmin
            .from('feedback')
            .select('*', { count: 'exact' })
            .eq('site_id', siteId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[feedback/query] Error:', error);
            return encryptedJsonResponse(
                { error: 'Failed to fetch feedback' },
                { status: 500 }
            );
        }

        return encryptedJsonResponse({
            feedback: feedback || [],
            total: count || 0,
        });

    } catch (error) {
        console.error('[feedback/query] Error:', error);
        return encryptedJsonResponse(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
