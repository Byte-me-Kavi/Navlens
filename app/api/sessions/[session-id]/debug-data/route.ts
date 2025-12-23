import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';

// Types for debug events
interface ConsoleEvent {
    event_type: 'console';
    timestamp: string;
    console_level: string;
    console_message: string;
    console_stack: string;
    page_url: string;
}

interface NetworkEvent {
    event_type: 'network';
    timestamp: string;
    network_method: string;
    network_url: string;
    network_status: number;
    network_duration_ms: number;
    network_type: string;
    network_initiator: string;
    request_size: number;
    response_size: number;
    page_url: string;
}

interface WebVitalEvent {
    event_type: 'web_vital';
    timestamp: string;
    vital_name: string;
    vital_value: number;
    vital_rating: string;
    vital_entries: string;
    page_url: string;
}

type DebugEvent = ConsoleEvent | NetworkEvent | WebVitalEvent;

interface DebugDataResponse {
    console: ConsoleEvent[];
    network: NetworkEvent[];
    webVitals: WebVitalEvent[];
    totalCount: number;
    sessionId: string;
}

// Create admin Supabase client for session verification
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get ClickHouse client
const clickhouse = getClickHouseClient();

// Cache for debug data (in-memory, 5-minute TTL)
const debugDataCache = new Map<string, { data: DebugDataResponse; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(sessionId: string, siteId: string): string {
    return `${siteId}:${sessionId}`;
}

function getFromCache(key: string): DebugDataResponse | null {
    const cached = debugDataCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }
    debugDataCache.delete(key);
    return null;
}

function setCache(key: string, data: DebugDataResponse): void {
    debugDataCache.set(key, { data, timestamp: Date.now() });

    // Cleanup old entries (keep max 100 entries)
    if (debugDataCache.size > 100) {
        const entries = Array.from(debugDataCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, 50).forEach(([k]) => debugDataCache.delete(k));
    }
}

// CORS headers
function addCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    return response;
}

// CORS preflight
export async function OPTIONS() {
    return addCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ 'session-id': string }> }
) {
    try {
        const resolvedParams = await params;
        const sessionId = resolvedParams['session-id'];

        if (!sessionId || !validators.isValidSessionId(sessionId)) {
            return addCorsHeaders(
                NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
            );
        }

        // Get siteId from query params
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const eventType = searchParams.get('type'); // Optional filter: 'console', 'network', 'web_vital'
        const limit = parseInt(searchParams.get('limit') || '500');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!siteId || !validators.isValidUUID(siteId)) {
            return addCorsHeaders(
                NextResponse.json({ error: 'siteId query parameter is required' }, { status: 400 })
            );
        }

        // Check cache first (only for full requests without filters)
        const cacheKey = getCacheKey(sessionId, siteId);
        if (!eventType && offset === 0 && limit === 500) {
            const cached = getFromCache(cacheKey);
            if (cached) {
                console.log(`[debug-data] Cache hit for session ${sessionId}`);
                return addCorsHeaders(NextResponse.json(cached));
            }
        }

        // Verify site exists and user has access (basic check)
        const { data: siteData, error: siteError } = await supabaseAdmin
            .from('sites')
            .select('id')
            .eq('id', siteId)
            .single();

        if (siteError || !siteData) {
            return addCorsHeaders(
                NextResponse.json({ error: 'Site not found' }, { status: 404 })
            );
        }

        // Build query
        let query = `
      SELECT 
        event_type,
        timestamp,
        console_level,
        console_message,
        console_stack,
        network_method,
        network_url,
        network_status,
        network_duration_ms,
        network_type,
        network_initiator,
        request_size,
        response_size,
        vital_name,
        vital_value,
        vital_rating,
        vital_entries,
        page_url
      FROM debug_events
      WHERE site_id = {siteId:String}
        AND session_id = {sessionId:String}
    `;

        const queryParams: Record<string, string> = {
            siteId,
            sessionId,
        };

        // Add event type filter if specified
        if (eventType && ['console', 'network', 'web_vital'].includes(eventType)) {
            query += ` AND event_type = {eventType:String}`;
            queryParams.eventType = eventType;
        }

        query += ` ORDER BY timestamp ASC LIMIT {limit:Int32} OFFSET {offset:Int32}`;
        queryParams.limit = limit.toString();
        queryParams.offset = offset.toString();

        console.log(`[debug-data] Querying debug events for session ${sessionId}`);

        const result = await clickhouse.query({
            query,
            query_params: queryParams,
            format: 'JSONEachRow',
        });

        // ClickHouse returns array from json()
        const rawRows = await result.json();
        const rows = rawRows as DebugEvent[];

        // Separate events by type
        const consoleEvents: ConsoleEvent[] = [];
        const networkEvents: NetworkEvent[] = [];
        const webVitalEvents: WebVitalEvent[] = [];

        for (const row of rows) {
            if (row.event_type === 'console') {
                consoleEvents.push(row as ConsoleEvent);
            } else if (row.event_type === 'network') {
                networkEvents.push(row as NetworkEvent);
            } else if (row.event_type === 'web_vital') {
                webVitalEvents.push(row as WebVitalEvent);
            }
        }

        const response: DebugDataResponse = {
            console: consoleEvents,
            network: networkEvents,
            webVitals: webVitalEvents,
            totalCount: rows.length,
            sessionId,
        };

        // Cache the response (only for full requests)
        if (!eventType && offset === 0 && limit === 500) {
            setCache(cacheKey, response);
        }

        console.log(`[debug-data] Returning ${rows.length} events for session ${sessionId}`);

        return addCorsHeaders(NextResponse.json(response));

    } catch (error: unknown) {
        console.error('[debug-data] Error:', error);
        return addCorsHeaders(
            NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        );
    }
}
