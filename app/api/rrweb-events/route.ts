import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Function to get country from IP using ipapi.co
async function getCountryFromIP(ip: string): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const response = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data.country_name || null;
        }
    } catch (error) {
        console.warn('Failed to geolocate IP:', error);
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const { site_id, page_path, session_id, visitor_id, events, timestamp, user_agent, screen_width, screen_height, language, timezone, referrer, viewport_width, viewport_height, device_pixel_ratio, platform, cookie_enabled, online, device_type, load_time, dom_ready_time } = await req.json();

        if (!site_id || !events || !Array.isArray(events)) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // Get the site owner's user_id from the sites table using api_key
        const { data: siteData, error: siteError } = await supabase
            .from('sites')
            .select('user_id')
            .eq('api_key', site_id)
            .single();

        if (siteError || !siteData) {
            console.error('Site not found:', siteError);
            return NextResponse.json({ error: 'Invalid site_id' }, { status: 400 });
        }

        const ownerUserId = siteData.user_id;

        // Get client IP address
        const forwarded = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');
        const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';

        // Get country from IP (async but we'll wait for it)
        const country = await getCountryFromIP(ip);

        // Store rrweb events in Supabase
        const { error } = await supabase
            .from('rrweb_events')
            .insert({
                site_id,
                page_path,
                session_id,
                user_id: ownerUserId,
                visitor_id,
                events: events, // Store as JSONB directly
                timestamp: new Date(timestamp),
                created_at: new Date(),
                ip_address: ip,
                country,
                user_agent,
                screen_width,
                screen_height,
                language,
                timezone,
                referrer,
                viewport_width,
                viewport_height,
                device_pixel_ratio,
                platform,
                cookie_enabled,
                online,
                device_type,
                load_time,
                dom_ready_time,
            });

        if (error) {
            console.error('Failed to store rrweb events:', error);
            return NextResponse.json({ error: 'Failed to store events' }, { status: 500 });
        }

        return NextResponse.json({ success: true, events_count: events.length });

    } catch (error: unknown) {
        console.error('rrweb events upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}