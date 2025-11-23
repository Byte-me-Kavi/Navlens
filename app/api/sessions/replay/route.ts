import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { siteId, sessionId } = await req.json();

        if (!siteId || !sessionId) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 });
        }

        // 1. Fetch ALL event chunks for this session
        // Order by id or timestamp to ensure correct playback sequence
        const { data: chunks, error } = await supabase
            .from('rrweb_events')
            .select('events')
            .eq('site_id', siteId)
            .eq('session_id', sessionId)
            .order('id', { ascending: true }); // Critical: Maintain sequence

        if (error) throw error;
        if (!chunks || chunks.length === 0) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // 2. STITCHING: Merge all batches into a single event array
        // The DB stores arrays of events in each row. We need to flatten them.
        let fullSessionEvents: any[] = [];
        
        chunks.forEach(chunk => {
            // Handle case where events might be stringified JSON or object
            const batch = typeof chunk.events === 'string' 
                ? JSON.parse(chunk.events) 
                : chunk.events;
                
            if (Array.isArray(batch)) {
                fullSessionEvents.push(...batch);
            }
        });

        // 3. Sort events by timestamp (Crucial for accurate playback)
        // Sometimes network requests arrive out of order, so we re-sort via the event timestamp.
        fullSessionEvents.sort((a, b) => a.timestamp - b.timestamp);

        // 4. Optimize: Return metadata for the UI (duration, start time) if needed
        const startTime = fullSessionEvents[0]?.timestamp;
        const endTime = fullSessionEvents[fullSessionEvents.length - 1]?.timestamp;
        const duration = endTime - startTime;

        return NextResponse.json({ 
            events: fullSessionEvents,
            meta: {
                totalEvents: fullSessionEvents.length,
                startTime,
                duration
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Replay API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}