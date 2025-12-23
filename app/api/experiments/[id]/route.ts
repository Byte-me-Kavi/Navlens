/**
 * Single Experiment API
 * 
 * Endpoints for managing individual experiments:
 * - GET: Get experiment details
 * - PATCH: Update experiment (status, variants, etc.)
 * - DELETE: Delete experiment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { invalidateExperiment } from '@/lib/experiments/cache';
import { publishSiteConfig } from '@/lib/experiments/publisher';
import type { UpdateExperimentRequest, ExperimentStatus } from '@/lib/experiments/types';
import { getUserFromRequest } from '@/lib/auth';
import { secureCorsHeaders } from '@/lib/security';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// SECURITY: Use secure CORS headers (validates origin instead of wildcard)
const corsHeaders = secureCorsHeaders;

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders('*')
    });
}

/**
 * GET /api/experiments/[id]?siteId=xxx
 * Get single experiment details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const { id } = await params;

    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            // Return 404 instead of 400 for missing siteId (quieter for browser prefetch)
            return NextResponse.json(
                { error: 'Not found' },
                { status: 404, headers: corsHeaders(origin) }
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

        // Fetch experiment
        const { data: experiment, error } = await supabaseAdmin
            .from('experiments')
            .select('*')
            .eq('id', id)
            .eq('site_id', siteId)
            .single();

        if (error || !experiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404, headers: corsHeaders(origin) }
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

        return NextResponse.json(
            { experiment },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error: unknown) {
        console.error('[experiments/[id]] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}

/**
 * PATCH /api/experiments/[id]
 * Update experiment (status, name, variants, etc.)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const { id } = await params;

    try {
        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        const body = await request.json() as UpdateExperimentRequest & { siteId: string };
        const { siteId, status, name, description, variants, traffic_percentage, goal_event, target_urls } = body;

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400, headers: corsHeaders(origin) }
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

        // Get current experiment
        const { data: currentExperiment, error: fetchError } = await supabaseAdmin
            .from('experiments')
            .select('*')
            .eq('id', id)
            .eq('site_id', siteId)
            .single();

        if (fetchError || !currentExperiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404, headers: corsHeaders(origin) }
            );
        }

        // Build update object
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim() || null;
        if (variants !== undefined) updateData.variants = variants;
        if (traffic_percentage !== undefined) updateData.traffic_percentage = traffic_percentage;
        if (goal_event !== undefined) updateData.goal_event = goal_event;
        if (target_urls !== undefined) updateData.target_urls = target_urls;

        // Handle status transitions
        let statusChanged = false;
        if (status !== undefined) {
            const validTransitions: Record<ExperimentStatus, ExperimentStatus[]> = {
                'draft': ['running', 'completed'],
                'running': ['paused', 'completed'],
                'paused': ['running', 'completed'],
                'completed': [] // Cannot transition from completed
            };

            const currentStatus = currentExperiment.status as ExperimentStatus;
            if (!validTransitions[currentStatus].includes(status)) {
                return NextResponse.json(
                    { error: `Cannot transition from ${currentStatus} to ${status}` },
                    { status: 400, headers: corsHeaders(origin) }
                );
            }

            updateData.status = status;
            statusChanged = true;

            // Set timestamps based on status
            if (status === 'running' && !currentExperiment.started_at) {
                updateData.started_at = new Date().toISOString();
            }
            if (status === 'completed') {
                updateData.ended_at = new Date().toISOString();
            }
        }

        // Update experiment
        const { data: experiment, error } = await supabaseAdmin
            .from('experiments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[experiments/[id]] Update error:', error);
            return NextResponse.json(
                { error: 'Failed to update experiment' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        // Invalidate cache
        invalidateExperiment(siteId, id);

        // Publish config to CDN when status changes
        if (statusChanged) {
            publishSiteConfig(siteId).catch(err => {
                console.error('[experiments/[id]] Publish error:', err);
            });
        }

        return NextResponse.json(
            { experiment },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error: unknown) {
        console.error('[experiments/[id]] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}

/**
 * DELETE /api/experiments/[id]?siteId=xxx
 * Delete an experiment (only if draft or completed)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get('origin');
    const { id } = await params;

    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');

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

        // Only allow deleting draft or completed experiments
        if (experiment.status === 'running' || experiment.status === 'paused') {
            return NextResponse.json(
                { error: 'Cannot delete running or paused experiment. Complete it first.' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Delete experiment
        const { error } = await supabaseAdmin
            .from('experiments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[experiments/[id]] Delete error:', error);
            return NextResponse.json(
                { error: 'Failed to delete experiment' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        // Invalidate cache
        invalidateExperiment(siteId, id);

        return NextResponse.json(
            { success: true },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error: unknown) {
        console.error('[experiments/[id]] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
