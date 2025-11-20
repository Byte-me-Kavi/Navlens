import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    console.log('=== RRWeb Events API Called ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers));
    
    try {
        const body = await req.json();
        console.log('Received body keys:', Object.keys(body));

        // Destructure all fields sent by tracker.js
        const {
            site_id, page_path, session_id, visitor_id, events, timestamp,
            user_agent, screen_width, screen_height, language, timezone,
            referrer, viewport_width, viewport_height, device_pixel_ratio,
            platform, cookie_enabled, online, device_type, load_time, dom_ready_time
        } = body;

        if (!site_id || !events) {
            const response = NextResponse.json({ error: 'Missing required data' }, { status: 400 });
            response.headers.set('Access-Control-Allow-Origin', '*');
            response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
            return response;
        }

        // For rrweb events, we'll accept any site_id without validation
        // This allows collecting data from sites that aren't registered yet
        let ownerUserId = null;

        // Try to lookup the site owner if the site exists
        try {
            const { data: siteData, error: siteError } = await supabase
                .from('sites')
                .select('user_id')
                .eq('id', site_id)
                .single();

            if (!siteError && siteData && siteData.user_id) {
                ownerUserId = siteData.user_id;
                console.log('Found site owner user_id:', ownerUserId);
            } else {
                console.log('Site not found or no user_id, proceeding without user_id');
            }
        } catch (error) {
            console.log('Error looking up site, proceeding without user_id:', error);
        }

        // --- 2. GET GEO LOCATION (IP & Country) ---
        // Vercel/Next.js provides IP headers automatically
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        // Vercel also provides country code in headers (Free & Pro plans)
        const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

        // --- 3. INSERT INTO SUPABASE ---
        console.log('Inserting rrweb events for site_id:', site_id, 'events count:', events.length);
        
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
        };

        console.log('Insert data keys:', Object.keys(insertData));
        console.log('Insert data sample:', JSON.stringify(insertData).substring(0, 500));

        try {
            const { error } = await supabase
                .from('rrweb_events')
                .insert(insertData);

            if (error) {
                console.error('Supabase Insert Error:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                const response = NextResponse.json({ 
                    error: 'Database insert failed', 
                    details: error.message,
                    code: error.code 
                }, { status: 500 });
                response.headers.set('Access-Control-Allow-Origin', '*');
                response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
                response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
                return response;
            }

            console.log('Successfully inserted rrweb events');
            console.log('Returning success response');
            const response = NextResponse.json({ success: true });
            response.headers.set('Access-Control-Allow-Origin', '*');
            response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
            return response;
        } catch (dbError) {
            console.error('Database operation failed:', dbError);
            const response = NextResponse.json({ 
                error: 'Database operation failed', 
                details: dbError instanceof Error ? dbError.message : 'Unknown error'
            }, { status: 500 });
            response.headers.set('Access-Control-Allow-Origin', '*');
            response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
            return response;
        }

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('RRWeb Event Error:', err);
        const response = NextResponse.json({ error: err.message }, { status: 500 });
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        return response;
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        },
    });
}
