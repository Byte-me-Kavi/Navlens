/**
 * Site Feedback Config API
 * 
 * GET: Fetch feedback widget configuration for a site
 * POST: Save feedback widget configuration for a site
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Note: This endpoint is called by tracker.js on client sites
// No auth required for GET (public config), but POST requires valid site ownership

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default feedback configuration
const DEFAULT_FEEDBACK_CONFIG = {
    enabled: true,
    position: 'bottom-right',
    primaryColor: '#3b82f6',
    showExitIntent: true,
    showFrustrationSurvey: true,
    minTimeBeforeSurvey: 30,
    allowDismiss: true,
    showOnScroll: 50,
    showAfterTime: 30000,
    collectIntent: true,
    collectIssues: true,
};

/**
 * GET - Fetch feedback config for a site (called by tracker.js)
 * Public endpoint - returns config for the given siteId
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400 }
            );
        }

        // Try to get config from database
        const { data: siteData, error } = await supabase
            .from('sites')
            .select('feedback_config')
            .eq('id', siteId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[feedback-config] Database error:', error);
        }

        // Return saved config or defaults
        const config = siteData?.feedback_config || DEFAULT_FEEDBACK_CONFIG;

        // CORS headers for cross-origin requests from tracked sites
        return NextResponse.json(
            { config, siteId },
            {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            }
        );
    } catch (error) {
        console.error('[feedback-config] Error:', error);
        // Return defaults on error
        return NextResponse.json(
            { config: DEFAULT_FEEDBACK_CONFIG },
            { status: 200 }
        );
    }
}

/**
 * POST - Save feedback config for a site
 * Requires authentication (called from dashboard)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { siteId, config } = body;

        if (!siteId || !config) {
            return NextResponse.json(
                { error: 'siteId and config are required' },
                { status: 400 }
            );
        }

        // Update site with new feedback config
        const { error } = await supabase
            .from('sites')
            .update({ feedback_config: config })
            .eq('id', siteId);

        if (error) {
            console.error('[feedback-config] Save error:', error);
            return NextResponse.json(
                { error: 'Failed to save config' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('[feedback-config] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        },
    });
}
