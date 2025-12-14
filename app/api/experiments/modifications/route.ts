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

// Modification types - expanded to support all editor features
type ModificationType =
    // Phase 1: Content
    | 'css' | 'text' | 'hide' | 'image' | 'link' | 'insertHtml' | 'replaceHtml'
    // Phase 2: Visual
    | 'resize' | 'clone' | 'reorder' | 'move'
    // Phase 3: Attribute
    | 'attribute' | 'class'
    // Phase 4: Interactive
    | 'clickRedirect' | 'tooltip' | 'sticky'
    // Phase 5: Form
    | 'placeholder' | 'formAction'
    // Phase 6: Animation
    | 'animation';

interface Modification {
    id: string;
    variant_id: string;
    selector: string;
    type: ModificationType;
    changes: {
        // Phase 1: Content
        css?: Record<string, string>;
        text?: string;
        imageUrl?: string;
        linkUrl?: string;
        linkTarget?: '_blank' | '_self';
        html?: string;
        insertPosition?: 'before' | 'after' | 'prepend' | 'append';
        // Phase 2: Visual
        width?: string;
        height?: string;
        cloneCount?: number;
        newIndex?: number;
        position?: { x: number; y: number };
        // Phase 3: Attribute
        attributes?: Record<string, string>;
        addClass?: string[];
        removeClass?: string[];
        // Phase 4: Interactive
        redirectUrl?: string;
        tooltipText?: string;
        tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
        stickyTop?: string;
        stickyZIndex?: number;
        // Phase 5: Form
        placeholderText?: string;
        formActionUrl?: string;
        // Phase 6: Animation
        animationName?: string;
        animationDuration?: string;
        animationCustom?: string;
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

// Valid modification types
const VALID_MODIFICATION_TYPES: ModificationType[] = [
    'css', 'text', 'hide', 'image', 'link', 'insertHtml', 'replaceHtml',
    'resize', 'clone', 'reorder', 'move',
    'attribute', 'class',
    'clickRedirect', 'tooltip', 'sticky',
    'placeholder', 'formAction',
    'animation'
];

// Dangerous HTML attributes to strip
const DANGEROUS_ATTRS = /^on\w+$/i;

// Sanitize HTML content (strip scripts and event handlers)
function sanitizeHtml(html: string): string {
    return String(html)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, 'data-removed=')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .slice(0, 10000);
}

// Sanitize URL (block javascript: and other dangerous protocols)
function sanitizeUrl(url: string): string {
    const trimmed = String(url).trim();
    // Block dangerous protocols
    if (/^(javascript|vbscript|data):/i.test(trimmed)) {
        return '';
    }
    return trimmed.slice(0, 2000);
}

// Sanitize modifications
function sanitizeModifications(mods: Modification[]): Modification[] {
    return mods.map(mod => {
        // Validate type
        const modType = VALID_MODIFICATION_TYPES.includes(mod.type as ModificationType)
            ? mod.type as ModificationType
            : 'css';

        const sanitized: Modification = {
            id: mod.id || crypto.randomUUID(),
            variant_id: String(mod.variant_id || ''),
            selector: String(mod.selector || '').slice(0, 500),
            type: modType,
            changes: {}
        };

        const changes = mod.changes || {};

        // Phase 1: Content modifications
        if (modType === 'css' && changes.css) {
            sanitized.changes.css = {};
            for (const [prop, value] of Object.entries(changes.css)) {
                if (ALLOWED_CSS_PROPERTIES.has(prop) && typeof value === 'string') {
                    sanitized.changes.css[prop] = sanitizeCssValue(value);
                }
            }
        }

        if (modType === 'text' && changes.text !== undefined) {
            sanitized.changes.text = String(changes.text).slice(0, 5000);
        }

        if (modType === 'image' && changes.imageUrl) {
            sanitized.changes.imageUrl = sanitizeUrl(changes.imageUrl);
        }

        if (modType === 'link') {
            if (changes.linkUrl) {
                sanitized.changes.linkUrl = sanitizeUrl(changes.linkUrl);
            }
            if (changes.linkTarget === '_blank' || changes.linkTarget === '_self') {
                sanitized.changes.linkTarget = changes.linkTarget;
            }
        }

        if ((modType === 'insertHtml' || modType === 'replaceHtml') && changes.html) {
            sanitized.changes.html = sanitizeHtml(changes.html);
            if (modType === 'insertHtml') {
                const validPositions = ['before', 'after', 'prepend', 'append'];
                sanitized.changes.insertPosition = validPositions.includes(changes.insertPosition || '')
                    ? changes.insertPosition as 'before' | 'after' | 'prepend' | 'append'
                    : 'after';
            }
        }

        // Phase 2: Visual modifications
        if (modType === 'resize') {
            if (changes.width) sanitized.changes.width = sanitizeCssValue(changes.width);
            if (changes.height) sanitized.changes.height = sanitizeCssValue(changes.height);
        }

        if (modType === 'clone') {
            sanitized.changes.cloneCount = Math.min(Math.max(1, parseInt(String(changes.cloneCount)) || 1), 10);
        }

        if (modType === 'reorder') {
            sanitized.changes.newIndex = parseInt(String(changes.newIndex)) || 0;
        }

        if (modType === 'move' && changes.position) {
            sanitized.changes.position = {
                x: parseInt(String(changes.position.x)) || 0,
                y: parseInt(String(changes.position.y)) || 0
            };
        }

        // Phase 3: Attribute modifications
        if (modType === 'attribute' && changes.attributes) {
            sanitized.changes.attributes = {};
            for (const [attr, value] of Object.entries(changes.attributes)) {
                // Block event handlers
                if (!DANGEROUS_ATTRS.test(attr)) {
                    sanitized.changes.attributes[attr] = String(value).slice(0, 1000);
                }
            }
        }

        if (modType === 'class') {
            if (Array.isArray(changes.addClass)) {
                sanitized.changes.addClass = changes.addClass
                    .filter(c => typeof c === 'string')
                    .map(c => c.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100))
                    .slice(0, 20);
            }
            if (Array.isArray(changes.removeClass)) {
                sanitized.changes.removeClass = changes.removeClass
                    .filter(c => typeof c === 'string')
                    .map(c => c.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100))
                    .slice(0, 20);
            }
        }

        // Phase 4: Interactive modifications
        if (modType === 'clickRedirect' && changes.redirectUrl) {
            sanitized.changes.redirectUrl = sanitizeUrl(changes.redirectUrl);
        }

        if (modType === 'tooltip') {
            if (changes.tooltipText) {
                sanitized.changes.tooltipText = String(changes.tooltipText).slice(0, 500);
            }
            const validPositions = ['top', 'bottom', 'left', 'right'];
            if (validPositions.includes(changes.tooltipPosition || '')) {
                sanitized.changes.tooltipPosition = changes.tooltipPosition as 'top' | 'bottom' | 'left' | 'right';
            }
        }

        if (modType === 'sticky') {
            if (changes.stickyTop) sanitized.changes.stickyTop = sanitizeCssValue(changes.stickyTop);
            if (changes.stickyZIndex) {
                sanitized.changes.stickyZIndex = Math.min(Math.max(0, parseInt(String(changes.stickyZIndex)) || 100), 9999999);
            }
        }

        // Phase 5: Form modifications
        if (modType === 'placeholder' && changes.placeholderText !== undefined) {
            sanitized.changes.placeholderText = String(changes.placeholderText).slice(0, 500);
        }

        if (modType === 'formAction' && changes.formActionUrl) {
            sanitized.changes.formActionUrl = sanitizeUrl(changes.formActionUrl);
        }

        // Phase 6: Animation
        if (modType === 'animation') {
            if (changes.animationName) {
                sanitized.changes.animationName = String(changes.animationName)
                    .replace(/[^a-zA-Z0-9_-]/g, '')
                    .slice(0, 50);
            }
            if (changes.animationDuration) {
                sanitized.changes.animationDuration = sanitizeCssValue(changes.animationDuration);
            }
            if (changes.animationCustom) {
                sanitized.changes.animationCustom = sanitizeCssValue(changes.animationCustom);
            }
        }

        return sanitized;
    });
}

// CORS headers - must return specific origin for credentials: 'include'
function corsHeaders(origin: string | null) {
    const allowedOrigin = origin || '*';
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

/**
 * GET /api/experiments/modifications?experimentId=xxx&siteId=yyy
 * 
 * Authentication: Cookie-based OR signature-based (for cross-origin editor)
 */
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const { searchParams } = new URL(request.url);
        const experimentId = searchParams.get('experimentId');
        const siteId = searchParams.get('siteId');
        const timestamp = searchParams.get('ts');
        const signature = searchParams.get('sig');

        if (!experimentId || !siteId) {
            return NextResponse.json(
                { error: 'experimentId and siteId are required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Try cookie-based auth first
        let isAuthorized = false;
        const user = await getUserFromRequest(request);

        if (user) {
            // Verify user owns this site
            const { data: site } = await supabaseAdmin
                .from('sites')
                .select('user_id')
                .eq('id', siteId)
                .single();

            if (site && site.user_id === user.id) {
                isAuthorized = true;
            }
        }

        // If no cookie auth, try signature-based auth (for cross-origin editor)
        if (!isAuthorized && signature && timestamp) {
            try {
                const { validateEditorSignature } = await import('@/lib/experiments/editor-security');
                // Need to get variantId from params for validation
                const variantId = searchParams.get('variantId') || '';
                const result = validateEditorSignature(experimentId, variantId, timestamp, signature);
                if (result.valid) {
                    isAuthorized = true;
                }
            } catch {
                // Signature verification failed
            }
        }

        if (!isAuthorized) {
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
 * 
 * Authentication: Cookie-based OR signature-based (for cross-origin)
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        const body = await request.json();
        const { experimentId, siteId, variantId, modifications, timestamp, signature } = body;

        if (!experimentId || !siteId || !Array.isArray(modifications)) {
            return NextResponse.json(
                { error: 'experimentId, siteId, and modifications array are required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Try cookie-based auth first
        let isAuthorized = false;
        const user = await getUserFromRequest(request);

        if (user) {
            // Cookie auth: verify user owns the site
            const { data: site } = await supabaseAdmin
                .from('sites')
                .select('user_id')
                .eq('id', siteId)
                .single();

            isAuthorized = site?.user_id === user.id;
        }

        // Fall back to signature-based auth for cross-origin
        if (!isAuthorized && signature && timestamp && variantId) {
            const EDITOR_SECRET = process.env.NAVLENS_EDITOR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            const { createHmac } = await import('crypto');

            // Validate timestamp (1 hour expiry)
            const ts = parseInt(timestamp, 10);
            const age = Date.now() - ts;
            const MAX_AGE = 60 * 60 * 1000; // 1 hour

            if (!isNaN(ts) && age >= 0 && age <= MAX_AGE) {
                // Verify signature
                const payload = `${experimentId}:${variantId}:${timestamp}`;
                const expectedSig = createHmac('sha256', EDITOR_SECRET)
                    .update(payload)
                    .digest('hex')
                    .slice(0, 16);

                if (signature === expectedSig) {
                    // Signature valid, verify experiment belongs to site
                    const { data: exp } = await supabaseAdmin
                        .from('experiments')
                        .select('id')
                        .eq('id', experimentId)
                        .eq('site_id', siteId)
                        .single();

                    isAuthorized = !!exp;
                }
            }
        }

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized - invalid signature or session' },
                { status: 401, headers: corsHeaders(origin) }
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
