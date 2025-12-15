import { NextRequest, NextResponse } from 'next/server';
import { validators, validateRequestSize, ValidationError, ValidatedEventData, EventData } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';
import { checkRateLimits, isRedisAvailable } from '@/lib/ratelimit';
import { parseRequestBody } from '@/lib/decompress';
import { validateSiteAndOrigin, addTrackerCorsHeaders, createPreflightResponse } from '@/lib/trackerCors';

/**
 * Batch API Endpoint
 * 
 * Accepts mixed event types in a single request to reduce network overhead.
 * Falls back gracefully - tracker uses individual endpoints if this fails.
 * 
 * Supports: analytics, debug, forms in single batch
 */

const clickhouse = getClickHouseClient();

console.log(`[v1/batch] Rate limiting: ${isRedisAvailable() ? 'Redis' : 'In-memory'}`);

// PII patterns for debug events
const PII_PATTERNS: Record<string, { pattern: RegExp; replacement: string }> = {
    email: { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL_REDACTED]' },
    phone: { pattern: /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g, replacement: '[PHONE_REDACTED]' },
    creditCard: { pattern: /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})/g, replacement: '[CC_REDACTED]' },
    ssn: { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: '[SSN_REDACTED]' },
    token: { pattern: /(?:token|key|password|secret|auth)[=:]["']?[a-zA-Z0-9_-]{8,}["']?/gi, replacement: '[TOKEN_REDACTED]' },
};

function scrubPII(text: string): string {
    if (typeof text !== 'string') return text;
    let scrubbed = text;
    for (const config of Object.values(PII_PATTERNS)) {
        scrubbed = scrubbed.replace(config.pattern, config.replacement);
    }
    return scrubbed;
}

function sanitizeUrl(url: string): string {
    if (!url) return '';
    try {
        const urlObj = new URL(url);
        const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth', 'api_key', 'apikey', 'access_token'];
        sensitiveParams.forEach(param => {
            if (urlObj.searchParams.has(param)) urlObj.searchParams.set(param, '[REDACTED]');
        });
        return urlObj.toString();
    } catch {
        return scrubPII(url);
    }
}

// Sensitive form field patterns
const SENSITIVE_FIELD_PATTERNS = [/password/i, /ssn/i, /social.*security/i, /credit.*card/i, /cvv/i, /pin/i, /secret/i];

function isSensitiveField(fieldName: string, fieldType: string): boolean {
    if (fieldType === 'password') return true;
    return SENSITIVE_FIELD_PATTERNS.some(p => p.test(fieldName));
}

// Types
interface DebugEvent {
    type: 'console' | 'network' | 'web_vital';
    timestamp: string;
    level?: string;
    message?: string;
    stack?: string;
    method?: string;
    url?: string;
    status?: number;
    duration_ms?: number;
    network_type?: string;
    initiator?: string;
    vital_name?: string;
    vital_value?: number;
    vital_rating?: string;
    page_url?: string;
    page_path?: string;
}

interface FormEvent {
    form_id: string;
    form_url: string;
    field_id: string;
    field_name: string;
    field_type: string;
    field_index: number;
    interaction_type: 'focus' | 'blur' | 'change' | 'submit' | 'abandon';
    time_spent_ms?: number;
    change_count?: number;
    was_refilled?: boolean;
    timestamp: string;
}

interface BatchPayload {
    siteId: string;
    sessionId: string;
    visitorId?: string;
    batch: {
        analytics?: EventData[];
        debug?: DebugEvent[];
        forms?: FormEvent[];
    };
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return createPreflightResponse(origin);
}

function jsonResponse(data: object, status: number = 200, origin: string | null = null, isAllowed: boolean = true): NextResponse {
    const response = NextResponse.json(data, { status });
    return addTrackerCorsHeaders(response, origin, isAllowed);
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const origin = request.headers.get('origin');

    try {
        // Max 2MB for batch requests
        if (!validateRequestSize(request, 2)) {
            return jsonResponse({ error: 'Request too large (max 2MB)' }, 413, origin);
        }

        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') || 'unknown';

        const body = await parseRequestBody<BatchPayload>(request);
        const { siteId, sessionId, batch } = body;

        // Validate required fields
        if (!siteId || !validators.isValidUUID(siteId)) {
            return jsonResponse({ error: 'Invalid siteId' }, 400, origin);
        }
        if (!sessionId || typeof sessionId !== 'string') {
            return jsonResponse({ error: 'sessionId required' }, 400, origin);
        }
        if (!batch || typeof batch !== 'object') {
            return jsonResponse({ error: 'batch object required' }, 400, origin);
        }

        // Rate limit check
        const rateLimitResult = await checkRateLimits(clientIP, siteId);
        if (!rateLimitResult.allowed) {
            const response = jsonResponse({ error: rateLimitResult.reason || 'Rate limit exceeded' }, 429, origin);
            Object.entries(rateLimitResult.headers).forEach(([k, v]) => response.headers.set(k, v));
            return response;
        }

        // Validate site and origin
        const validation = await validateSiteAndOrigin(siteId, origin);
        if (!validation.valid) return jsonResponse({ error: 'Invalid site ID' }, 403, origin, false);
        if (!validation.allowed) return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });

        const results = { analytics: 0, debug: 0, forms: 0, errors: 0 };

        // Process analytics events
        if (batch.analytics && Array.isArray(batch.analytics) && batch.analytics.length > 0) {
            const analyticsEvents = batch.analytics.slice(0, 100); // Max 100
            const validEvents: ValidatedEventData[] = [];

            for (const rawEvent of analyticsEvents) {
                try {
                    validEvents.push(validators.validateEventData(rawEvent));
                } catch (e) {
                    results.errors++;
                }
            }

            if (validEvents.length > 0) {
                try {
                    const insertData = validEvents.map(event => ({
                        site_id: siteId,
                        event_id: event.data?.event_id || crypto.randomUUID(),
                        event_type: event.type,
                        timestamp: new Date(event.timestamp),
                        session_id: event.session_id,
                        user_id: event.user_id || null,
                        page_url: event.page_url || '',
                        page_path: event.page_path || '',
                        referrer: event.referrer || '',
                        user_agent: event.user_agent || '',
                        viewport_width: event.viewport_width || 0,
                        viewport_height: event.viewport_height || 0,
                        screen_width: event.screen_width || 0,
                        screen_height: event.screen_height || 0,
                        device_type: event.device_type || '',
                        ip_address: clientIP,
                        x: event.data?.x ?? 0,
                        y: event.data?.y ?? 0,
                        x_relative: event.data?.x_relative ?? 0,
                        y_relative: event.data?.y_relative ?? 0,
                        scroll_depth: event.data?.scroll_depth ?? 0,
                        document_width: event.data?.document_width ?? 0,
                        document_height: event.data?.document_height ?? 0,
                        element_selector: event.data?.element_selector || '',
                        element_tag: event.data?.element_tag || '',
                        is_dead_click: event.data?.is_dead_click ?? false,
                        experiment_ids: Array.isArray(event.experiment_ids) ? event.experiment_ids : [],
                        variant_ids: Array.isArray(event.variant_ids) ? event.variant_ids : [],
                        created_at: new Date(),
                    }));

                    await clickhouse.insert({ table: 'events', values: insertData, format: 'JSONEachRow' });
                    results.analytics = validEvents.length;
                } catch (e) {
                    console.error('[v1/batch] Analytics insert error:', e);
                    results.errors++;
                }
            }
        }

        // Process debug events
        if (batch.debug && Array.isArray(batch.debug) && batch.debug.length > 0) {
            const debugEvents = batch.debug.slice(0, 50); // Max 50
            try {
                const insertData = debugEvents.map((event, idx) => {
                    const baseData = {
                        site_id: siteId,
                        session_id: sessionId,
                        event_id: `debug_${sessionId}_${Date.now()}_${idx}`,
                        event_type: event.type,
                        timestamp: new Date(event.timestamp),
                        page_url: sanitizeUrl(event.page_url || ''),
                        page_path: validators.sanitizeString(event.page_path || '', 1000),
                        created_at: new Date(),
                        // Type-specific fields with defaults
                        console_level: event.type === 'console' ? validators.sanitizeString(event.level || '', 20) : '',
                        console_message: event.type === 'console' ? scrubPII(validators.sanitizeString(event.message || '', 10000)) : '',
                        console_stack: event.type === 'console' ? scrubPII(validators.sanitizeString(event.stack || '', 5000)) : '',
                        network_method: event.type === 'network' ? validators.sanitizeString(event.method || '', 10) : '',
                        network_url: event.type === 'network' ? sanitizeUrl(event.url || '') : '',
                        network_status: event.type === 'network' && typeof event.status === 'number' ? event.status : 0,
                        network_duration_ms: event.type === 'network' && typeof event.duration_ms === 'number' ? event.duration_ms : 0,
                        vital_name: event.type === 'web_vital' ? validators.sanitizeString(event.vital_name || '', 20) : '',
                        vital_value: event.type === 'web_vital' && typeof event.vital_value === 'number' ? event.vital_value : 0,
                        vital_rating: event.type === 'web_vital' ? validators.sanitizeString(event.vital_rating || '', 20) : '',
                    };
                    return baseData;
                });

                await clickhouse.insert({ table: 'debug_events', values: insertData, format: 'JSONEachRow' });
                results.debug = debugEvents.length;
            } catch (e) {
                console.error('[v1/batch] Debug insert error:', e);
                results.errors++;
            }
        }

        // Process form events
        if (batch.forms && Array.isArray(batch.forms) && batch.forms.length > 0) {
            const formEvents = batch.forms.slice(0, 20).filter(e =>
                !isSensitiveField(e.field_name || '', e.field_type || '') &&
                ['focus', 'blur', 'change', 'submit', 'abandon'].includes(e.interaction_type)
            );

            if (formEvents.length > 0) {
                try {
                    const insertData = formEvents.map(event => ({
                        site_id: siteId,
                        session_id: sessionId,
                        form_id: validators.sanitizeString(event.form_id || '', 200),
                        form_url: validators.sanitizeString(event.form_url || '', 2000),
                        field_id: validators.sanitizeString(event.field_id || '', 200),
                        field_name: validators.sanitizeString(event.field_name || '', 200),
                        field_type: validators.sanitizeString(event.field_type || 'text', 50),
                        field_index: Math.min(Math.max(event.field_index || 0, 0), 255),
                        interaction_type: event.interaction_type,
                        time_spent_ms: Math.min(event.time_spent_ms || 0, 3600000),
                        change_count: Math.min(event.change_count || 0, 255),
                        was_refilled: event.was_refilled || false,
                        timestamp: new Date(event.timestamp),
                        created_at: new Date(),
                    }));

                    await clickhouse.insert({ table: 'form_interactions', values: insertData, format: 'JSONEachRow' });
                    results.forms = formEvents.length;
                } catch (e) {
                    console.error('[v1/batch] Form insert error:', e);
                    results.errors++;
                }
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[v1/batch] Processed analytics:${results.analytics} debug:${results.debug} forms:${results.forms} in ${duration}ms`);

        const response = jsonResponse({
            success: true,
            processed: results,
            duration_ms: duration,
        }, 200, origin);

        Object.entries(rateLimitResult.headers).forEach(([k, v]) => response.headers.set(k, v));
        return response;

    } catch (error) {
        console.error('[v1/batch] Error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, origin);
    }
}

// Health check
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    return jsonResponse({
        status: 'healthy',
        endpoint: 'batch',
        rateLimit: isRedisAvailable() ? 'redis' : 'memory',
        timestamp: new Date().toISOString(),
    }, 200, origin);
}
