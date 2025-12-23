/**
 * Merged Tracker Config API
 * 
 * Combines experiments and feedback config into a single request
 * to reduce network overhead during tracker initialization.
 * 
 * GET /api/tracker-config?siteId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// In-memory cache (60 seconds TTL)
const configCache = new Map<string, { data: TrackerConfig; expires: number }>();
const CACHE_TTL = 60 * 1000;

interface TrackerConfig {
    v: number;
    ts: number;
    experiments: Array<{
        id: string;
        v: Array<{ id: string; name: string; weight: number }>;
        m: Array<{ id: string; selector: string; variant_id: string; type: string; changes: Record<string, unknown> }>;
        t: number;
        g?: string;
        goals?: unknown[];
    }>;
    feedback: typeof DEFAULT_FEEDBACK_CONFIG;
    features: {
        formTracking: boolean;
        mouseHeatmap: boolean;
        sessionRecording: boolean;
    };
}

// CORS headers
function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

import { withMonitoring } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

async function GET_handler(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Check cache first
        const cached = configCache.get(siteId);
        if (cached && cached.expires > Date.now()) {
            return NextResponse.json(cached.data, {
                status: 200,
                headers: corsHeaders(origin)
            });
        }

        // Fetch both configs in parallel
        const [experimentsResult, siteResult] = await Promise.all([
            // Fetch active experiments
            supabaseAdmin
                .from('experiments')
                .select('id, variants, modifications, traffic_percentage, goal_event, goals')
                .eq('site_id', siteId)
                .eq('status', 'running'),
            // Fetch site config (includes feedback_config and status)
            supabaseAdmin
                .from('sites')
                .select('feedback_config, status')
                .eq('id', siteId)
                .single()
        ]);

        // Check if site is BANNED
        if (siteResult.data?.status === 'banned') {
            console.log(`[Tracker] Site ${siteId} is banned. Returning empty config.`);
            return NextResponse.json({
                v: 1,
                ts: Date.now(),
                experiments: [],
                feedback: { enabled: false },
                features: { formTracking: false, mouseHeatmap: false, sessionRecording: false },
                error: 'Site is unavailable'
            }, { status: 200, headers: corsHeaders(origin) });
        }

        // Build experiments array
        const experiments = (experimentsResult.data || []).map(e => ({
            id: e.id,
            v: e.variants || [],
            m: e.modifications || [],
            t: e.traffic_percentage || 100,
            g: e.goal_event || undefined,
            goals: e.goals || []
        }));

        // Get feedback config or defaults
        const feedbackConfig = siteResult.data?.feedback_config || DEFAULT_FEEDBACK_CONFIG;

        // Build merged config
        const config: TrackerConfig = {
            v: 1,
            ts: Date.now(),
            experiments,
            feedback: feedbackConfig,
            features: {
                formTracking: true,
                mouseHeatmap: true,
                sessionRecording: true,
            }
        };

        // Cache the result
        configCache.set(siteId, {
            data: config,
            expires: Date.now() + CACHE_TTL
        });

        return NextResponse.json(config, {
            status: 200,
            headers: corsHeaders(origin)
        });

    } catch (error: unknown) {
        console.error('[tracker-config] Error:', error);
        // Return minimal valid config on error
        return NextResponse.json({
            v: 1,
            ts: Date.now(),
            experiments: [],
            feedback: DEFAULT_FEEDBACK_CONFIG,
            features: { formTracking: true, mouseHeatmap: true, sessionRecording: true }
        }, { status: 200, headers: corsHeaders(origin) });
    }
}

export const GET = withMonitoring(GET_handler);
