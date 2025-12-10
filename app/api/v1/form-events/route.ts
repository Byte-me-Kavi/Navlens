import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators, validateRequestSize } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';
import { checkRateLimits, isRedisAvailable } from '@/lib/ratelimit';
import { parseRequestBody } from '@/lib/decompress';

// Sensitive field patterns to skip
const SENSITIVE_FIELD_PATTERNS = [
    /password/i,
    /ssn/i,
    /social.*security/i,
    /credit.*card/i,
    /card.*number/i,
    /cvv/i,
    /cvc/i,
    /pin/i,
    /secret/i,
];

// Check if field should be skipped
function isSensitiveField(fieldName: string, fieldType: string): boolean {
    if (fieldType === 'password') return true;
    return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName));
}

// Sanitize field identifier
function sanitizeFieldId(value: string): string {
    if (!value) return '';
    // Remove any potential script injection, limit length
    return value.replace(/[<>'"&]/g, '').substring(0, 200);
}

// Form event types
interface FormEvent {
    form_id: string;
    form_url: string;
    field_id: string;
    field_name: string;
    field_type: string;
    field_index: number;
    interaction_type: 'focus' | 'blur' | 'change' | 'submit' | 'abandon';
    focus_time?: string;
    blur_time?: string;
    time_spent_ms?: number;
    change_count?: number;
    was_refilled?: boolean;
    field_had_value?: boolean;
    was_submitted?: boolean;
    timestamp: string;
}

interface FormEventsPayload {
    events: FormEvent[];
    siteId: string;
    sessionId: string;
}

// CORS headers
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
    if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
        response.headers.set('Access-Control-Allow-Origin', '*');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Content-Encoding, x-api-key');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ClickHouse client
const clickhouse = getClickHouseClient();

console.log(`[v1/form-events] Rate limiting: ${isRedisAvailable() ? 'Redis' : 'In-memory'}`);

// CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return addCorsHeaders(new NextResponse(null, { status: 204 }), origin);
}

// JSON response helper
function jsonResponse(data: object, status: number = 200, origin?: string | null): NextResponse {
    const response = NextResponse.json(data, { status });
    return addCorsHeaders(response, origin);
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const origin = request.headers.get('origin');

    try {
        // Validate request size (max 200KB)
        if (!validateRequestSize(request, 0.2)) {
            return jsonResponse({ error: 'Request too large (max 200KB)' }, 413, origin);
        }

        // Rate limiting
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') || 'unknown';

        // Parse body
        const body = await parseRequestBody<FormEventsPayload>(request);
        const { events, siteId, sessionId } = body;

        // Validate required fields
        if (!events || !Array.isArray(events) || events.length === 0) {
            return jsonResponse({ error: 'events must be a non-empty array' }, 400, origin);
        }

        if (!siteId || !validators.isValidUUID(siteId)) {
            return jsonResponse({ error: 'Invalid siteId' }, 400, origin);
        }

        if (!sessionId || typeof sessionId !== 'string') {
            return jsonResponse({ error: 'sessionId is required' }, 400, origin);
        }

        // Rate limit check
        const rateLimitResult = await checkRateLimits(clientIP, siteId);
        if (!rateLimitResult.allowed) {
            return jsonResponse({ error: rateLimitResult.reason || 'Rate limit exceeded' }, 429, origin);
        }

        // Limit events per request (max 20)
        if (events.length > 20) {
            return jsonResponse({ error: 'Too many events (max 20 per request)' }, 400, origin);
        }

        // Validate site exists
        const { data: siteData, error: siteError } = await supabaseAdmin
            .from('sites')
            .select('id')
            .eq('id', siteId)
            .single();

        if (siteError || !siteData) {
            return jsonResponse({ error: 'Invalid site ID' }, 403, origin);
        }

        console.log(`[v1/form-events] Processing ${events.length} form events for session ${sessionId}`);

        // Filter and process events
        const validEvents = events.filter(event => {
            // Skip sensitive fields
            if (isSensitiveField(event.field_name || '', event.field_type || '')) {
                return false;
            }
            // Validate interaction type
            if (!['focus', 'blur', 'change', 'submit', 'abandon'].includes(event.interaction_type)) {
                return false;
            }
            return true;
        });

        if (validEvents.length === 0) {
            return jsonResponse({ success: true, processed: 0, skipped: events.length }, 200, origin);
        }

        // Transform to ClickHouse format
        const insertData = validEvents.map((event, idx) => ({
            site_id: siteId,
            session_id: sessionId,
            form_id: sanitizeFieldId(event.form_id),
            form_url: validators.sanitizeString(event.form_url || '', 2000),
            field_id: sanitizeFieldId(event.field_id),
            field_name: sanitizeFieldId(event.field_name),
            field_type: validators.sanitizeString(event.field_type || 'text', 50),
            field_index: Math.min(Math.max(event.field_index || 0, 0), 255),
            interaction_type: event.interaction_type,
            focus_time: event.focus_time ? new Date(event.focus_time) : new Date(),
            blur_time: event.blur_time ? new Date(event.blur_time) : new Date(),
            time_spent_ms: Math.min(event.time_spent_ms || 0, 3600000), // Max 1 hour
            change_count: Math.min(event.change_count || 0, 255),
            was_refilled: event.was_refilled || false,
            field_had_value: event.field_had_value || false,
            was_submitted: event.was_submitted || false,
            timestamp: new Date(event.timestamp),
            created_at: new Date(),
        }));

        // Insert into ClickHouse
        try {
            await clickhouse.insert({
                table: 'form_interactions',
                values: insertData,
                format: 'JSONEachRow',
            });
        } catch (dbError) {
            console.error('[v1/form-events] ClickHouse insert error:', dbError);
            return jsonResponse({ error: 'Failed to store form events' }, 500, origin);
        }

        const duration = Date.now() - startTime;
        console.log(`[v1/form-events] Processed ${validEvents.length} events in ${duration}ms`);

        return jsonResponse({
            success: true,
            processed: validEvents.length,
            skipped: events.length - validEvents.length,
            duration_ms: duration,
        }, 200, origin);

    } catch (error) {
        console.error('[v1/form-events] Error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, origin);
    }
}

// Health check
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    return jsonResponse({
        status: 'healthy',
        endpoint: 'form-events',
        timestamp: new Date().toISOString(),
    }, 200, origin);
}
