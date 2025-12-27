import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { parseRequestBody } from '@/lib/decompress';
import { validateSiteAndOrigin, addTrackerCorsHeaders, createPreflightResponse } from '@/lib/trackerCors';

// Route segment config - increase body size limit for rrweb events
export const maxDuration = 30; // 30 seconds max execution time
export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const origin = req.headers.get('origin');
    console.log('=== RRWeb Events API Called ===');
    console.log(`[rrweb-events] Origin: ${origin}, Method: POST`);

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
            const response = NextResponse.json(
                { error: 'Missing required data' },
                { status: 400 }
            );
            return addTrackerCorsHeaders(response, origin, true);
        }

        // --- VALIDATION: Prevent Database Bloat ---
        if (!Array.isArray(events)) {
            const response = NextResponse.json(
                { error: 'Invalid data format: events must be an array' },
                { status: 400 }
            );
            return addTrackerCorsHeaders(response, origin, true);
        }

        // Limit batch size to reasonable amount (prevents memory spikes and huge rows)
        const MAX_EVENTS_PER_BATCH = 2000; // ample for typical partial snapshots
        if (events.length > MAX_EVENTS_PER_BATCH) {
            const response = NextResponse.json(
                { error: `Batch too large. Max ${MAX_EVENTS_PER_BATCH} events allowed.` },
                { status: 413 }
            );
            return addTrackerCorsHeaders(response, origin, true);
        }


        // Validate site exists AND origin is allowed
        const validation = await validateSiteAndOrigin(site_id, origin);

        if (!validation.valid) {
            console.warn(`[rrweb-events] Invalid site_id: ${site_id}`);
            const response = NextResponse.json(
                { error: 'Invalid site' },
                { status: 403 }
            );
            return addTrackerCorsHeaders(response, origin, false);
        }

        if (!validation.allowed) {
            console.warn(`[rrweb-events] Origin ${origin} not allowed for site ${site_id}`);
            const response = NextResponse.json(
                { error: 'Origin not allowed' },
                { status: 403 }
            );
            // Don't add CORS headers - browser will block the request
            return response;
        }

        // --- SESSION LIMIT ENFORCEMENT ---
        // Get the site owner's user_id to check their subscription limits
        const { data: siteData } = await supabase
            .from('sites')
            .select('user_id')
            .eq('id', site_id)
            .single();

        if (siteData?.user_id) {
            // Check if this is a NEW session recording
            const { count: existingSession } = await supabase
                .from('rrweb_events')
                .select('session_id', { count: 'exact', head: true })
                .eq('session_id', session_id);

            const isNewRecording = existingSession === 0;

            if (isNewRecording) {
                // Use the new usage tracker to check recording limits
                const { getUserPlanLimits, incrementRecordingCount } = await import('@/lib/usage-tracker/counter');
                const limits = await getUserPlanLimits(siteData.user_id);

                const result = await incrementRecordingCount(siteData.user_id, limits.recordings);

                if (!result.success) {
                    console.warn(`[rrweb-events] Recording limit reached for user ${siteData.user_id}`);
                    const response = NextResponse.json(
                        {
                            error: 'Recording limit reached',
                            limit: limits.recordings,
                            message: 'Your subscription recording limit has been reached. Please upgrade your plan.'
                        },
                        { status: 403 }
                    );
                    return addTrackerCorsHeaders(response, origin, true);
                }

                console.log(`[rrweb-events] New recording tracked for user ${siteData.user_id}`);
            }
        }

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
            session_id: session_id || '',
            visitor_id: visitor_id || '',
            page_path: page_path || '',
            events, // The big JSON blob
            timestamp: timestamp || new Date().toISOString(),

            // Don't include user_id - tracked via site_id

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
                const response = NextResponse.json({
                    error: 'Database insert failed',
                    details: error.message,
                    code: error.code
                }, { status: 500 });
                return addTrackerCorsHeaders(response, origin, true);
            }

            const duration = Date.now() - startTime;
            console.log(`[rrweb-events] Success - ${events.length} events in ${duration}ms`);
            const response = NextResponse.json({ success: true });
            return addTrackerCorsHeaders(response, origin, true);
        } catch (dbError: unknown) {
            console.error('[rrweb-events] Database operation failed:', dbError);
            const response = NextResponse.json({
                error: 'Database operation failed',
                details: dbError instanceof Error ? dbError.message : 'Unknown error'
            }, { status: 500 });
            return addTrackerCorsHeaders(response, origin, true);
        }

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[rrweb-events] Error:', err.message);
        const response = NextResponse.json({ error: err.message }, { status: 500 });
        return addTrackerCorsHeaders(response, null, true);
    }
}

export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin');
    console.log(`[rrweb-events] OPTIONS preflight from origin: ${origin}`);
    return createPreflightResponse(origin);
}
