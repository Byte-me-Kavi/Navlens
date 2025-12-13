import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators, ValidationError, validateRequestSize } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';
import { checkRateLimits, isRedisAvailable } from '@/lib/ratelimit';
import { parseRequestBody } from '@/lib/decompress';
import { validateSiteAndOrigin, addTrackerCorsHeaders, createPreflightResponse } from '@/lib/trackerCors';

// PII scrubbing patterns (reuse from tracker concept)
const PII_PATTERNS: Record<string, { pattern: RegExp; replacement: string }> = {
    email: {
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        replacement: '[EMAIL_REDACTED]',
    },
    phone: {
        pattern: /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g,
        replacement: '[PHONE_REDACTED]',
    },
    creditCard: {
        pattern: /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})/g,
        replacement: '[CC_REDACTED]',
    },
    ssn: {
        pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
        replacement: '[SSN_REDACTED]',
    },
    token: {
        pattern: /(?:token|key|password|secret|auth)[=:]["']?[a-zA-Z0-9_-]{8,}["']?/gi,
        replacement: '[TOKEN_REDACTED]',
    },
};

// Scrub PII from a string
function scrubPII(text: string): string {
    if (typeof text !== 'string') return text;
    let scrubbed = text;
    for (const config of Object.values(PII_PATTERNS)) {
        scrubbed = scrubbed.replace(config.pattern, config.replacement);
    }
    return scrubbed;
}

// Sanitize URL - remove sensitive query parameters
function sanitizeUrl(url: string): string {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth', 'api_key', 'apikey', 'access_token'];
        sensitiveParams.forEach(param => {
            if (urlObj.searchParams.has(param)) {
                urlObj.searchParams.set(param, '[REDACTED]');
            }
        });
        return urlObj.toString();
    } catch {
        return scrubPII(url);
    }
}

// Debug event types
interface DebugEvent {
    type: 'console' | 'network' | 'web_vital';
    timestamp: string;

    // Console fields
    level?: string;
    message?: string;
    stack?: string;

    // Network fields
    method?: string;
    url?: string;
    status?: number;
    duration_ms?: number;
    network_type?: string;
    initiator?: string;
    request_size?: number;
    response_size?: number;

    // Web Vitals fields
    vital_name?: string;
    vital_value?: number;
    vital_rating?: string;
    vital_entries?: string;

    // Context
    page_url?: string;
    page_path?: string;
}

interface DebugEventsPayload {
    events: DebugEvent[];
    siteId: string;
    sessionId: string;
}

// Create admin Supabase client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get ClickHouse client
const clickhouse = getClickHouseClient();

// Log startup info
console.log(`[v1/debug-events] Rate limiting: ${isRedisAvailable() ? 'Redis' : 'In-memory'}`);

// CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return createPreflightResponse(origin);
}

// Helper for JSON responses
function jsonResponse(data: object, status: number = 200, origin: string | null = null, isAllowed: boolean = true): NextResponse {
    const response = NextResponse.json(data, { status });
    return addTrackerCorsHeaders(response, origin, isAllowed);
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const origin = request.headers.get('origin');

    try {
        // Validate request size (max 500KB for debug events)
        if (!validateRequestSize(request, 0.5)) {
            return jsonResponse({ error: 'Request too large (max 500KB)' }, 413, origin);
        }

        // Get client IP for rate limiting
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Parse body
        const body = await parseRequestBody<DebugEventsPayload>(request);
        const { events, siteId, sessionId } = body;

        // Validate required fields
        if (!events || !Array.isArray(events) || events.length === 0) {
            return jsonResponse({ error: 'events must be a non-empty array' }, 400, origin);
        }

        if (!siteId || typeof siteId !== 'string') {
            return jsonResponse({ error: 'siteId is required' }, 400, origin);
        }

        if (!sessionId || typeof sessionId !== 'string') {
            return jsonResponse({ error: 'sessionId is required' }, 400, origin);
        }

        // Validate siteId format
        if (!validators.isValidUUID(siteId)) {
            return jsonResponse({ error: 'Invalid site ID format' }, 400, origin);
        }

        // Rate limiting (100 debug events per second per session)
        const rateLimitResult = await checkRateLimits(clientIP, siteId);
        if (!rateLimitResult.allowed) {
            const response = jsonResponse({ error: rateLimitResult.reason || 'Rate limit exceeded' }, 429, origin);
            Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

        // Limit events per request (max 50)
        if (events.length > 50) {
            return jsonResponse({ error: 'Too many events (max 50 per request)' }, 400, origin);
        }

        // Validate site exists AND origin is allowed
        const validation = await validateSiteAndOrigin(siteId, origin);

        if (!validation.valid) {
            return jsonResponse({ error: 'Invalid site ID' }, 403, origin, false);
        }

        if (!validation.allowed) {
            console.warn(`[v1/debug-events] Origin ${origin} not allowed for site ${siteId}`);
            return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
        }

        console.log(`[v1/debug-events] Processing ${events.length} debug events for session ${sessionId}`);

        // Process and insert events
        const insertData = events.map((event, index) => {
            const eventId = `debug_${sessionId}_${Date.now()}_${index}`;

            // Base fields
            const baseData = {
                site_id: siteId,
                session_id: sessionId,
                event_id: eventId,
                event_type: event.type,
                timestamp: new Date(event.timestamp),
                page_url: sanitizeUrl(event.page_url || ''),
                page_path: validators.sanitizeString(event.page_path || '', 1000),
                created_at: new Date(),
            };

            // Add type-specific fields
            if (event.type === 'console') {
                return {
                    ...baseData,
                    console_level: validators.sanitizeString(event.level || '', 20),
                    console_message: scrubPII(validators.sanitizeString(event.message || '', 10000)),
                    console_stack: scrubPII(validators.sanitizeString(event.stack || '', 5000)),
                };
            } else if (event.type === 'network') {
                return {
                    ...baseData,
                    network_method: validators.sanitizeString(event.method || '', 10),
                    network_url: sanitizeUrl(event.url || ''),
                    network_status: typeof event.status === 'number' ? event.status : 0,
                    network_duration_ms: typeof event.duration_ms === 'number' ? event.duration_ms : 0,
                    network_type: validators.sanitizeString(event.network_type || '', 10),
                    network_initiator: validators.sanitizeString(event.initiator || '', 100),
                    request_size: typeof event.request_size === 'number' ? event.request_size : 0,
                    response_size: typeof event.response_size === 'number' ? event.response_size : 0,
                };
            } else if (event.type === 'web_vital') {
                return {
                    ...baseData,
                    vital_name: validators.sanitizeString(event.vital_name || '', 20),
                    vital_value: typeof event.vital_value === 'number' ? event.vital_value : 0,
                    vital_rating: validators.sanitizeString(event.vital_rating || '', 20),
                    vital_entries: validators.sanitizeString(event.vital_entries || '', 5000),
                };
            }

            return baseData;
        });

        // Batch insert into ClickHouse
        try {
            await clickhouse.insert({
                table: 'debug_events',
                values: insertData,
                format: 'JSONEachRow',
            });
        } catch (dbError) {
            console.error('[v1/debug-events] ClickHouse insert error:', dbError);
            return jsonResponse({ error: 'Failed to store debug events' }, 500, origin);
        }

        const duration = Date.now() - startTime;
        console.log(`[v1/debug-events] Processed ${events.length} events in ${duration}ms`);

        const response = jsonResponse({
            success: true,
            processed: events.length,
            duration_ms: duration,
        }, 200, origin);

        Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;

    } catch (error) {
        console.error('[v1/debug-events] Error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, origin);
    }
}

// Health check
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    return jsonResponse({
        status: 'healthy',
        endpoint: 'debug-events',
        rateLimit: isRedisAvailable() ? 'redis' : 'memory',
        timestamp: new Date().toISOString(),
    }, 200, origin);
}
