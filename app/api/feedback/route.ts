import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators } from '@/lib/validation';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { validateSiteAndOrigin, addTrackerCorsHeaders, createPreflightResponse } from '@/lib/trackerCors';

const gunzipAsync = promisify(gunzip);

// Use service role key for server-side inserts (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting: 5 feedback per session per minute
const feedbackRateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;

function checkRateLimit(sessionId: string): boolean {
    const now = Date.now();
    const limit = feedbackRateLimits.get(sessionId);

    if (!limit || now > limit.resetTime) {
        feedbackRateLimits.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (limit.count >= RATE_LIMIT_MAX) {
        return false;
    }

    limit.count++;
    return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    feedbackRateLimits.forEach((value, key) => {
        if (now > value.resetTime) {
            feedbackRateLimits.delete(key);
        }
    });
}, 60000);

/**
 * GET - Fetch feedback for a site (dashboard use)
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!siteId) {
            return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        // Fetch feedback for the site
        const { data: feedbacks, error, count } = await supabaseAdmin
            .from('feedback')
            .select('*', { count: 'exact' })
            .eq('site_id', siteId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[feedback] Fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
        }

        return NextResponse.json({
            feedbacks: feedbacks || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (error) {
        console.error('[feedback] GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST - Submit feedback (from tracker.js)
 */
export async function POST(request: NextRequest) {
    try {
        // Handle gzip-compressed requests from tracker
        let body;
        const contentEncoding = request.headers.get('content-encoding');

        if (contentEncoding === 'gzip') {
            try {
                const arrayBuffer = await request.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const decompressed = await gunzipAsync(buffer);
                body = JSON.parse(decompressed.toString('utf-8'));
            } catch (decompressError) {
                console.error('[feedback] Decompression error:', decompressError);
                const response = NextResponse.json({ error: 'Failed to decompress request' }, { status: 400 });
                return addTrackerCorsHeaders(response, request.headers.get('origin'), true);
            }
        } else {
            body = await request.json();
        }

        // Support both old format (site_id) and new format (siteId)
        const site_id = body.site_id || body.siteId;
        const session_id = body.session_id || body.sessionId;
        const visitor_id = body.visitor_id || body.visitorId;
        const feedback_type = body.feedback_type || body.surveyType || 'survey_response';
        const rating = body.rating;
        const message = body.message;
        const page_path = body.page_path || body.pagePath;
        const page_url = body.page_url || body.pageUrl;
        const device_type = body.device_type || body.deviceType;
        const user_agent = body.user_agent || body.userAgent;

        // New enhanced fields
        const intent = body.intent;
        const issues = body.issues;

        // Validate required fields
        if (!site_id || !session_id) {
            const response = NextResponse.json(
                { error: 'Missing required fields: siteId, sessionId' },
                { status: 400 }
            );
            return addTrackerCorsHeaders(response, request.headers.get('origin'), true);
        }

        // Validate site_id format (UUID check)
        if (!validators.isValidUUID(site_id)) {
            const response = NextResponse.json({ error: 'Invalid site_id format' }, { status: 400 });
            return addTrackerCorsHeaders(response, request.headers.get('origin'), true);
        }

        // Validate session_id format
        if (!validators.isValidSessionId(session_id)) {
            const response = NextResponse.json({ error: 'Invalid session_id format' }, { status: 400 });
            return addTrackerCorsHeaders(response, request.headers.get('origin'), true);
        }

        // Validate site exists AND origin is allowed
        const origin = request.headers.get('origin');
        const validation = await validateSiteAndOrigin(site_id, origin);

        if (!validation.valid) {
            const response = NextResponse.json({ error: 'Invalid site ID' }, { status: 403 });
            return addTrackerCorsHeaders(response, origin, false);
        }

        if (!validation.allowed) {
            console.warn(`[feedback] Origin ${origin} not allowed for site ${site_id}`);
            return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
        }

        // Rate limiting
        if (!checkRateLimit(session_id)) {
            const response = NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
            return addTrackerCorsHeaders(response, origin, true);
        }

        // Sanitize message
        const sanitizedMessage = message
            ? validators.sanitizeString(message, 2000)
            : null;

        // Validate rating if provided (support 1-5 scale)
        const validRating = typeof rating === 'number' && rating >= 1 && rating <= 5
            ? rating
            : null;

        // Build metadata with new fields
        const metadata = {
            intent: intent || null,
            issues: Array.isArray(issues) ? issues : [],
            ...(body.metadata || {}),
        };

        // Insert feedback
        const { data: feedback, error: insertError } = await supabaseAdmin
            .from('feedback')
            .insert({
                site_id,
                session_id: validators.sanitizeString(session_id, 128),
                visitor_id: visitor_id ? validators.sanitizeString(visitor_id, 128) : null,
                feedback_type,
                rating: validRating,
                message: sanitizedMessage,
                page_path: page_path ? validators.sanitizeString(page_path, 500) : null,
                page_url: page_url ? validators.sanitizeString(page_url, 2000) : null,
                device_type: device_type ? validators.sanitizeString(device_type, 20) : null,
                user_agent: user_agent ? validators.sanitizeString(user_agent, 500) : null,
                metadata,
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('[feedback] Insert error:', insertError);
            // Check if it's a foreign key violation (invalid site_id)
            if (insertError.code === '23503') {
                return NextResponse.json({ error: 'Invalid site_id' }, { status: 400 });
            }
            const response = NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
            return addTrackerCorsHeaders(response, origin, true);
        }

        const response = NextResponse.json({
            success: true,
            feedback_id: feedback.id,
        });
        return addTrackerCorsHeaders(response, origin, true);
    } catch (error: unknown) {
        console.error('[feedback] Error:', error);
        const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        return addTrackerCorsHeaders(response, origin, true);
    }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return createPreflightResponse(origin);
}

