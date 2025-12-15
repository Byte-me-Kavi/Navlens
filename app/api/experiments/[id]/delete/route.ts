/**
 * Delete Experiment API (POST)
 * 
 * POST /api/experiments/[id]/delete
 * Body: { siteId: string }
 * 
 * Uses POST instead of DELETE to ensure siteId is properly passed in body
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invalidateExperiment } from '@/lib/experiments/cache';
import { publishSiteConfig } from '@/lib/experiments/publisher';
import { getUserFromRequest } from '@/lib/auth';
import { secureCorsHeaders } from '@/lib/security';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = secureCorsHeaders;

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders('*')
    });
}

/**
 * POST /api/experiments/[id]/delete
 * Delete an experiment
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const { id } = await params;

    try {
        const body = await request.json();
        const { siteId } = body;

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        // Verify user has access to the site
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

        // Get experiment
        const { data: experiment, error: fetchError } = await supabaseAdmin
            .from('experiments')
            .select('status')
            .eq('id', id)
            .eq('site_id', siteId)
            .single();

        if (fetchError || !experiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404, headers: corsHeaders(origin) }
            );
        }

        // Delete experiment (allow all statuses since user confirmed with type-to-delete)
        const { error } = await supabaseAdmin
            .from('experiments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[experiments/[id]/delete] Delete error:', error);
            return NextResponse.json(
                { error: 'Failed to delete experiment' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        // Invalidate cache
        invalidateExperiment(siteId, id);

        // Republish site config to remove deleted experiment
        publishSiteConfig(siteId).catch(err => {
            console.error('[experiments/[id]/delete] Publish error:', err);
        });

        return NextResponse.json(
            { success: true },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error) {
        console.error('[experiments/[id]/delete] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
