import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to add CORS headers with dynamic origin
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
    // Use the requesting origin if provided, otherwise allow all
    // This is required because some browsers include credentials with fetch
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
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
            apiKey: siteData.api_key,
            domain: siteData.domain
        };
    },
    ['site-rrweb-validation'],
    { revalidate: 300 } // 5 minutes cache
);

// Timing-safe string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const origin = req.headers.get('origin');
    console.log('=== RRWeb Events API Called ===');
    
    try {
        const body = await req.json();

        // Destructure all fields sent by tracker.js
        const {
            site_id, api_key, page_path, session_id, visitor_id, events, timestamp,
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

        // Validate site exists and check API key
        const validation = await validateSiteAndAuth(site_id);
        
        if (!validation.valid) {
            console.warn(`[rrweb-events] Invalid site_id: ${site_id}`);
            return addCorsHeaders(NextResponse.json(
                { error: 'Invalid site' }, 
                { status: 403 }
            ), origin);
        }

        // If site has API key, require it from tracker
        if (validation.apiKey) {
            if (!api_key) {
                console.warn(`[rrweb-events] Site ${site_id} requires API key but none provided`);
                return addCorsHeaders(NextResponse.json(
                    { error: 'API key required' }, 
                    { status: 401 }
                ), origin);
            }
            if (!secureCompare(api_key, validation.apiKey)) {
                console.warn(`[rrweb-events] Invalid API key for site ${site_id}`);
                return addCorsHeaders(NextResponse.json(
                    { error: 'Invalid API key' }, 
                    { status: 401 }
                ), origin);
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
            screen_width: screen_width ? Math.min(parseInt(screen_width), 99999) : null,
            screen_height: screen_height ? Math.min(parseInt(screen_height), 99999) : null,
            viewport_width: viewport_width ? Math.min(parseInt(viewport_width), 99999) : null,
            viewport_height: viewport_height ? Math.min(parseInt(viewport_height), 99999) : null,
            device_pixel_ratio: device_pixel_ratio ? Math.min(parseFloat(device_pixel_ratio), 99.99) : null,
            cookie_enabled,
            online,

            // Performance - ensure proper types and constraints
            load_time: load_time ? Math.min(parseFloat(load_time), 99999999.99) : null,
            dom_ready_time: dom_ready_time ? Math.min(parseFloat(dom_ready_time), 99999999.99) : null,
            
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
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}
