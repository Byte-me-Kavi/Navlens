/**
 * Modifications API
 * 
 * Save and retrieve visual modifications for experiment variants.
 * - GET: Fetch modifications for a specific experiment
 * - POST: Save modifications (from visual editor)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';
import { publishSiteConfig } from '@/lib/experiments/publisher';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Modification types
interface Modification {
    id: string;
    variant_id: string;
    selector: string;
    type: 'css' | 'text' | 'hide' | 'html' | 'redirect';
    changes: {
        css?: Record<string, string>;
        text?: string;
        html?: string;
        redirectUrl?: string;
    };
}

// Allowed CSS properties (security whitelist)
const ALLOWED_CSS_PROPERTIES = new Set([
    'color', 'backgroundColor', 'background', 'backgroundImage',
    'fontSize', 'fontWeight', 'fontFamily', 'fontStyle',
    'textDecoration', 'textAlign', 'lineHeight', 'letterSpacing',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'border', 'borderRadius', 'borderColor', 'borderWidth',
    'width', 'height', 'maxWidth', 'maxHeight', 'minWidth', 'minHeight',
    'display', 'visibility', 'opacity',
    'position', 'top', 'right', 'bottom', 'left', 'zIndex',
    'boxShadow', 'transform', 'transition'
]);

// Sanitize CSS value to prevent injection
function sanitizeCssValue(value: string): string {
    // Remove dangerous patterns
    return value
        .replace(/expression\s*\(/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/url\s*\([^)]*\)/gi, '')
        .replace(/behavior\s*:/gi, '')
        .slice(0, 500); // Max length
}

// Sanitize modifications
function sanitizeModifications(mods: Modification[]): Modification[] {
    return mods.map(mod => {
        const sanitized: Modification = {
            id: mod.id || crypto.randomUUID(),
            variant_id: String(mod.variant_id || ''),
            selector: String(mod.selector || '').slice(0, 200),
            type: ['css', 'text', 'hide', 'html', 'redirect'].includes(mod.type) ? mod.type : 'css',
            changes: {}
        };

        if (mod.type === 'css' && mod.changes.css) {
            sanitized.changes.css = {};
            for (const [prop, value] of Object.entries(mod.changes.css)) {
                if (ALLOWED_CSS_PROPERTIES.has(prop) && typeof value === 'string') {
                    sanitized.changes.css[prop] = sanitizeCssValue(value);
                }
            }
        }

        if (mod.type === 'text' && mod.changes.text) {
            sanitized.changes.text = String(mod.changes.text).slice(0, 5000);
        }

        if (mod.type === 'html' && mod.changes.html) {
            // Basic HTML sanitization (strip scripts)
            sanitized.changes.html = String(mod.changes.html)
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .slice(0, 10000);
        }

        if (mod.type === 'redirect' && mod.changes.redirectUrl) {
            const url = String(mod.changes.redirectUrl);
            // Only allow relative URLs or same-origin
            if (url.startsWith('/') && !url.startsWith('//')) {
                sanitized.changes.redirectUrl = url.slice(0, 500);
            }
        }

        return sanitized;
    });
}

// CORS headers
function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

/**
 * GET /api/experiments/modifications?experimentId=xxx&siteId=yyy
 */
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { searchParams } = new URL(request.url);
        const experimentId = searchParams.get('experimentId');
        const siteId = searchParams.get('siteId');

        if (!experimentId || !siteId) {
            return NextResponse.json(
                { error: 'experimentId and siteId are required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Authenticate
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
            .select('modifications, variants')
            .eq('id', experimentId)
            .eq('site_id', siteId)
            .single();

        if (error || !experiment) {
            return NextResponse.json(
                { error: 'Experiment not found' },
                { status: 404, headers: corsHeaders(origin) }
            );
        }

        return NextResponse.json(
            {
                modifications: experiment.modifications || [],
                variants: experiment.variants || []
            },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error) {
        console.error('[modifications] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}

/**
 * POST /api/experiments/modifications
 * Save modifications for an experiment variant
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        // Authenticate
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        const body = await request.json();
        const { experimentId, siteId, modifications } = body;

        if (!experimentId || !siteId || !Array.isArray(modifications)) {
            return NextResponse.json(
                { error: 'experimentId, siteId, and modifications array are required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Verify user has access to site
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

        // Sanitize modifications
        const sanitizedMods = sanitizeModifications(modifications);

        // Update experiment
        const { error } = await supabaseAdmin
            .from('experiments')
            .update({
                modifications: sanitizedMods,
                updated_at: new Date().toISOString()
            })
            .eq('id', experimentId)
            .eq('site_id', siteId);

        if (error) {
            console.error('[modifications] Update error:', error);
            return NextResponse.json(
                { error: 'Failed to save modifications' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        // Re-publish config if experiment is running
        const { data: experiment } = await supabaseAdmin
            .from('experiments')
            .select('status')
            .eq('id', experimentId)
            .single();

        if (experiment?.status === 'running') {
            await publishSiteConfig(siteId);
        }

        return NextResponse.json(
            { success: true, modifications: sanitizedMods },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error) {
        console.error('[modifications] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
