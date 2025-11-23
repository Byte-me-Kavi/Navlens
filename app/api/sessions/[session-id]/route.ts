import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { siteId } = await req.json();
        const url = new URL(req.url);
        const sessionId = url.pathname.split('/').pop();

        if (!siteId || !sessionId) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 });
        }

        // Fetch first event chunk for session metadata
        const { data, error } = await supabase
            .from('rrweb_events')
            .select('*')
            .eq('site_id', siteId)
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true })
            .limit(1)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Return session metadata
        return NextResponse.json({ 
            session: {
                session_id: data.session_id,
                visitor_id: data.visitor_id,
                timestamp: data.timestamp,
                country: data.country,
                ip_address: data.ip_address,
                device_type: data.device_type,
                screen_width: data.screen_width,
                screen_height: data.screen_height,
                platform: data.platform,
                user_agent: data.user_agent,
                page_path: data.page_path,
                viewport_width: data.viewport_width,
                viewport_height: data.viewport_height,
            }
        }, { status: 200 });

    } catch (error: unknown) {
        console.error('Session Metadata API Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
