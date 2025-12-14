/**
 * Experiment Config API
 * 
 * Serves experiment configurations to tracker.js
 * Used when storage bucket is private (more secure)
 * 
 * GET /api/experiments/config?siteId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Minimal experiment for client
interface PublishedExperiment {
    id: string;
    v: Array<{ id: string; name: string; weight: number }>;
    m: Array<{
        id: string;
        selector: string;
        variant_id: string;
        type: string;
        changes: Record<string, unknown>;
    }>;
    t: number;
    g?: string;
}

interface PublishedConfig {
    v: number;
    ts: number;
    experiments: PublishedExperiment[];
}

// In-memory cache (60 seconds TTL)
const configCache = new Map<string, { data: PublishedConfig; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

// CORS headers
function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

export async function GET(request: NextRequest) {
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

        // Fetch active experiments from database
        const { data: experiments, error } = await supabaseAdmin
            .from('experiments')
            .select('id, variants, modifications, traffic_percentage, goal_event')
            .eq('site_id', siteId)
            .eq('status', 'running');

        if (error) {
            console.error('[config] Query error:', error);
            return NextResponse.json(
                { experiments: [] },
                { status: 200, headers: corsHeaders(origin) }
            );
        }

        // Build minimal config
        const config: PublishedConfig = {
            v: 1,
            ts: Date.now(),
            experiments: (experiments || []).map(e => ({
                id: e.id,
                v: e.variants || [],
                m: e.modifications || [],
                t: e.traffic_percentage || 100,
                g: e.goal_event || undefined
            }))
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

    } catch (error) {
        console.error('[config] Error:', error);
        return NextResponse.json(
            { experiments: [] },
            { status: 200, headers: corsHeaders(origin) }
        );
    }
}
