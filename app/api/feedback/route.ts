import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { validators } from '@/lib/validation';

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            site_id,
            session_id,
            visitor_id,
            feedback_type,
            rating,
            message,
            page_path,
            page_url,
            device_type,
            user_agent,
            metadata,
        } = body;

        // Validate required fields
        if (!site_id || !session_id || !feedback_type) {
            return NextResponse.json(
                { error: 'Missing required fields: site_id, session_id, feedback_type' },
                { status: 400 }
            );
        }

        // Validate site_id format (UUID check only - no DB lookup to avoid RLS issues)
        if (!validators.isValidUUID(site_id)) {
            return NextResponse.json({ error: 'Invalid site_id format' }, { status: 400 });
        }

        // Validate session_id format
        if (!validators.isValidSessionId(session_id)) {
            return NextResponse.json({ error: 'Invalid session_id format' }, { status: 400 });
        }

        // Rate limiting
        if (!checkRateLimit(session_id)) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        // Validate feedback type
        const validTypes = ['bug', 'suggestion', 'general', 'survey_response'];
        if (!validTypes.includes(feedback_type)) {
            return NextResponse.json({ error: 'Invalid feedback_type' }, { status: 400 });
        }

        // Sanitize message
        const sanitizedMessage = message
            ? validators.sanitizeString(message, 2000)
            : null;

        // Validate rating if provided
        const validRating = typeof rating === 'number' && rating >= 0 && rating <= 10
            ? rating
            : null;

        // Insert feedback (site_id foreign key will validate if site exists)
        const { data: feedback, error: insertError } = await supabase
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
                metadata: metadata || {},
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('[feedback] Insert error:', insertError);
            // Check if it's a foreign key violation (invalid site_id)
            if (insertError.code === '23503') {
                return NextResponse.json({ error: 'Invalid site_id' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            feedback_id: feedback.id,
        });
    } catch (error) {
        console.error('[feedback] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        },
    });
}
