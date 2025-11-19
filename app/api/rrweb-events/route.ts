import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Destructure all fields sent by tracker.js
        const {
            site_id, page_path, session_id, visitor_id, events, timestamp,
            user_agent, screen_width, screen_height, language, timezone,
            referrer, viewport_width, viewport_height, device_pixel_ratio,
            platform, cookie_enabled, online, device_type, load_time, dom_ready_time
        } = body;

        if (!site_id || !events) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // --- 1. LOOKUP SITE OWNER (Security & Relationship) ---
        // We need the 'user_id' of the site owner to fill the 'user_id' column in rrweb_events
        const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('user_id')
            .eq('id', site_id)
            .single();

        if (siteError || !siteData) {
            console.error('Invalid Site ID:', site_id);
            return NextResponse.json({ error: 'Invalid Site ID' }, { status: 403 });
        }

        const ownerUserId = siteData.user_id;

        // --- 2. GET GEO LOCATION (IP & Country) ---
        // Vercel/Next.js provides IP headers automatically
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

        // Vercel also provides country code in headers (Free & Pro plans)
        const country = req.headers.get('x-vercel-ip-country') || 'Unknown';

        // --- 3. INSERT INTO SUPABASE ---
        const { error } = await supabase
            .from('rrweb_events')
            .insert({
                // Primary Data
                site_id,
                user_id: ownerUserId, // The site owner
                session_id,
                visitor_id,
                page_path,
                events, // The big JSON blob
                timestamp: timestamp || new Date().toISOString(),

                // Metadata
                ip_address: ip,
                country: country,
                user_agent,
                language,
                timezone,
                referrer,
                platform,
                device_type,

                // Technical Specs
                screen_width,
                screen_height,
                viewport_width,
                viewport_height,
                device_pixel_ratio,
                cookie_enabled,
                online,

                // Performance
                load_time,
                dom_ready_time
            });

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('RRWeb Event Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}