import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUBLIC endpoint - no authentication required
// Used by public report pages to load session replays
export async function POST(req: NextRequest) {
    try {
        const { siteId, sessionId } = await req.json();

        if (!siteId || !sessionId) {
            return NextResponse.json({ error: 'Missing siteId or sessionId' }, { status: 400 });
        }

        // Fetch ALL event chunks for this session
        const { data: chunks, error } = await supabase
            .from('rrweb_events')
            .select('events')
            .eq('site_id', siteId)
            .eq('session_id', sessionId)
            .order('id', { ascending: true });

        if (error) {
            console.error('Public replay API error:', error);
            return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
        }

        if (!chunks || chunks.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Stitch all event batches into single array
        const fullSessionEvents: unknown[] = [];

        chunks.forEach(chunk => {
            const batch = typeof chunk.events === 'string'
                ? JSON.parse(chunk.events)
                : chunk.events;

            if (Array.isArray(batch)) {
                fullSessionEvents.push(...batch);
            }
        });

        // Sort events by timestamp for accurate playback
        fullSessionEvents.sort((a: any, b: any) => a.timestamp - b.timestamp); // eslint-disable-line @typescript-eslint/no-explicit-any

        // Calculate metadata
        const startTime = (fullSessionEvents[0] as any)?.timestamp; // eslint-disable-line @typescript-eslint/no-explicit-any
        const endTime = (fullSessionEvents[fullSessionEvents.length - 1] as any)?.timestamp; // eslint-disable-line @typescript-eslint/no-explicit-any
        const duration = endTime - startTime;

        return NextResponse.json({
            events: fullSessionEvents,
            meta: {
                totalEvents: fullSessionEvents.length,
                startTime,
                duration
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Public replay API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
