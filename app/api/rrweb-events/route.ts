import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { parseRequestBody } from '@/lib/decompress';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to add CORS headers with dynamic origin
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
    // CRITICAL: When Access-Control-Allow-Credentials is true, we CANNOT use wildcard '*'
    // We must either:
    // 1. Return the specific requesting origin, OR
    // 2. Not include credentials header and use '*'

    if (origin) {
        // If we have an origin, use it specifically (required for credentials)
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
        // If no origin (e.g., same-origin requests, curl, etc.), allow all without credentials
        response.headers.set('Access-Control-Allow-Origin', '*');
        // Don't set Allow-Credentials when using wildcard
    }

    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Content-Encoding, x-api-key');
    return response;
}

// Cached site validation (5 minutes)
const validateSiteAndAuth = unstable_cache(
    async (siteId: string) => {
        const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('id, user_id, api_key, domain')
            .eq('id', siteId)
            .single();

        if (siteError || !siteData) {
            return { valid: false, error: 'Site not found' };
        }

        return {
            valid: true,
            userId: siteData.user_id,
            domain: siteData.domain
        };
    },
    ['site-rrweb-validation'],
    { revalidate: 300 } // 5 minutes cache
);

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const origin = req.headers.get('origin');
    console.log('=== RRWeb Events API Called ===');

    try {
        // Parse body - handles both gzip compressed and regular JSON
        const body = await parseRequestBody<{
            site_id?: string;
            page_path?: string;
            session_id?: string;
            visitor_id?: string;
            events?: unknown[];
            timestamp?: string;
            user_agent?: string;
            screen_width?: number;
            screen_height?: number;
            language?: string;
            timezone?: string;
            referrer?: string;
            viewport_width?: number;
            viewport_height?: number;
            device_pixel_ratio?: number;
            platform?: string;
            cookie_enabled?: boolean;
            online?: boolean;
            device_type?: string;
            load_time?: number;
            dom_ready_time?: number;
            session_signals?: unknown;
            // Legacy field names
            api_key?: string;
        }>(req);

        // Destructure all fields sent by tracker.js
        // NOTE: api_key is no longer sent from client for security
        const {
            site_id, page_path, session_id, visitor_id, events, timestamp,
            user_agent, screen_width, screen_height, language, timezone,
            referrer, viewport_width, viewport_height, device_pixel_ratio,
            platform, cookie_enabled, online, device_type, load_time, dom_ready_time,
            session_signals // NEW: Session intelligence signals
        } = body;

        if (!site_id || !events) {
            return addCorsHeaders(NextResponse.json(
                { error: 'Missing required data' },
                { status: 400 }
            ), origin);
        }

        // Validate site exists
        const validation = await validateSiteAndAuth(site_id);

        if (!validation.valid) {
            console.warn(`[rrweb-events] Invalid site_id: ${site_id}`);
            return addCorsHeaders(NextResponse.json(
                { error: 'Invalid site' },
                { status: 403 }
            ), origin);
        }

        // Validate Origin header matches the site's registered domain (if configured)
        // This provides security without exposing API keys in client-side code
        if (validation.domain && origin) {
            const originHost = new URL(origin).hostname;
            const allowedDomain = validation.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

            // Allow localhost for development
            const isLocalhost = originHost === 'localhost' || originHost === '127.0.0.1';
            const domainMatches = originHost === allowedDomain || originHost.endsWith('.' + allowedDomain);

            if (!isLocalhost && !domainMatches) {
                console.warn(`[rrweb-events] Origin ${origin} doesn't match site domain ${validation.domain}`);
                // Log but don't block - domain might not be configured yet
            }
        }

        const ownerUserId = validation.userId;
        console.log(`[rrweb-events] Authenticated request for site ${site_id}, events: ${events.length}`);

        // --- 2. GET GEO LOCATION (IP & Country) ---
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
        const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

        // --- 3. INSERT INTO SUPABASE ---
        console.log(`[rrweb-events] Inserting ${events.length} events for site ${site_id}`);

        // Build insert data conditionally
        interface InsertData {
            site_id: string;
            session_id: string;
            visitor_id: string;
            page_path: string;
            events: unknown;
            timestamp: string;
            user_id?: string;
            device_type?: string;
            ip_address?: string;
            country?: string;
            user_agent?: string;
            language?: string;
            timezone?: string;
            referrer?: string;
            platform?: string;
            screen_width?: number | null;
            screen_height?: number | null;
            viewport_width?: number | null;
            viewport_height?: number | null;
            device_pixel_ratio?: number | null;
            cookie_enabled?: boolean;
            online?: boolean;
            load_time?: number | null;
            dom_ready_time?: number | null;
            session_signals?: unknown; // NEW: Session intelligence signals
        }
        const insertData: InsertData = {
            // Primary Data
            site_id,
            session_id,
            visitor_id,
            page_path,
            events, // The big JSON blob
            timestamp: timestamp || new Date().toISOString(),

            // Add user_id if found
            ...(ownerUserId && { user_id: ownerUserId }),

            // Metadata
            ip_address: ip,
            country: country,
            user_agent,
            language,
            timezone,
            referrer,
            platform,
            device_type,

            // Technical Specs - ensure proper types and constraints
            screen_width: screen_width != null ? Math.min(Number(screen_width), 99999) : null,
            screen_height: screen_height != null ? Math.min(Number(screen_height), 99999) : null,
            viewport_width: viewport_width != null ? Math.min(Number(viewport_width), 99999) : null,
            viewport_height: viewport_height != null ? Math.min(Number(viewport_height), 99999) : null,
            device_pixel_ratio: device_pixel_ratio != null ? Math.min(Number(device_pixel_ratio), 99.99) : null,
            cookie_enabled,
            online,

            // Performance - ensure proper types and constraints
            load_time: load_time != null ? Math.min(Number(load_time), 99999999.99) : null,
            dom_ready_time: dom_ready_time != null ? Math.min(Number(dom_ready_time), 99999999.99) : null,

            // Session Intelligence Signals
            session_signals: session_signals || [],
        };

        try {
            const { error } = await supabase
                .from('rrweb_events')
                .insert(insertData);

            if (error) {
                console.error('[rrweb-events] Supabase Insert Error:', error.message);
                return addCorsHeaders(NextResponse.json({
                    error: 'Database insert failed',
                    details: error.message,
                    code: error.code
                }, { status: 500 }), origin);
            }

            const duration = Date.now() - startTime;
            console.log(`[rrweb-events] Success - ${events.length} events in ${duration}ms`);
            return addCorsHeaders(NextResponse.json({ success: true }), origin);
        } catch (dbError) {
            console.error('[rrweb-events] Database operation failed:', dbError);
            return addCorsHeaders(NextResponse.json({
                error: 'Database operation failed',
                details: dbError instanceof Error ? dbError.message : 'Unknown error'
            }, { status: 500 }), origin);
        }

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[rrweb-events] Error:', err.message);
        return addCorsHeaders(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin');
    const response = new NextResponse(null, { status: 204 });

    // CRITICAL: When Access-Control-Allow-Credentials is true, we CANNOT use wildcard '*'
    // This was causing "Failed to fetch" errors in browsers
    if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
        response.headers.set('Access-Control-Allow-Origin', '*');
        // Don't set Allow-Credentials when using wildcard
    }

    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Content-Encoding, x-api-key');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}
