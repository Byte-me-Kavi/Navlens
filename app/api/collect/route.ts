import { createClient } from '@clickhouse/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize ClickHouse client for analytics data
const clickhouseClient = (() => {
    const url = process.env.CLICKHOUSE_URL;
    
    if (url) {
        // Production: Use full URL for ClickHouse Cloud (https://user:pass@host:8443/database)
        return createClient({ url });
    } else {
        // Development: Use host-based configuration for local ClickHouse
        return createClient({
            host: process.env.CLICKHOUSE_HOST || 'localhost',
            username: process.env.CLICKHOUSE_USER,
            password: process.env.CLICKHOUSE_PASSWORD,
            database: process.env.CLICKHOUSE_DATABASE,
        });
    }
})();

// Lazy initialize Supabase admin client for site validation
let supabaseAdmin: ReturnType<typeof createSupabaseClient> | null = null;
function getSupabaseAdminClient() {
    if (!supabaseAdmin) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !key) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseAdmin = createSupabaseClient(supabaseUrl, key);
    }
    return supabaseAdmin;
}

// Validate that the site_id exists in our system
async function validateSiteId(siteId: string): Promise<boolean> {
    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('sites')
            .select('id')
            .eq('id', siteId)
            .single();

        if (error) {
            console.warn(`[collect] Site validation FAILED for ${siteId}:`, error.message);
            return false;
        }

        if (data) {
            console.log(`[collect] Site validation SUCCESS for ${siteId}`);
            return true;
        }

        console.warn(`[collect] Site validation FAILED: No data found for ${siteId}`);
        return false;
    } catch (error) {
        console.error(`[collect] Unexpected error validating site ${siteId}:`, error);
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Handle both batched format { events: [...] } and legacy single event format
        let eventsArray: any[];
        if (body.events && Array.isArray(body.events)) {
            // New batched format from tracker.js
            eventsArray = body.events;
        } else if (Array.isArray(body)) {
            // Array of events
            eventsArray = body;
        } else {
            // Single event object (legacy format)
            eventsArray = [body];
        }

        if (eventsArray.length === 0) {
            return NextResponse.json(
                { message: 'No events provided' },
                { status: 400 }
            );
        }

        // Extract site_id from the first event (all events should have the same site_id)
        const siteId = eventsArray[0]?.site_id;
        if (!siteId) {
            console.warn('[collect] Missing site_id in event data');
            return NextResponse.json(
                { message: 'Invalid event data: missing site_id' },
                { status: 400 }
            );
        }

        // SECURITY: Validate that the site_id exists in our system
        const isValidSite = await validateSiteId(siteId);
        if (!isValidSite) {
            console.error(`[collect] REJECTED: Events for unknown/invalid site_id: ${siteId}`);
            return NextResponse.json(
                { message: 'Invalid site_id' },
                { status: 403 }
            );
        }

        console.log(`[collect] Received ${eventsArray.length} event(s) for VALID site ${siteId}:`, JSON.stringify(eventsArray.slice(0, 1)));
        
        // Perform the insertion into the 'events' table
        await clickhouseClient.insert({
            table: 'events',
            values: eventsArray,
            format: 'JSONEachRow',
        });
        
        console.log(`[collect] Successfully inserted ${eventsArray.length} event(s) for site ${siteId}`);
        
        // Return a successful response
        return NextResponse.json({ message: 'Events ingested successfully' }, { status: 200 });
        
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[collect] Error ingesting events to ClickHouse:', error);
        // Return an error response
        return NextResponse.json(
            { message: 'Failed to ingest events', error: errorMessage },
            { status: 500 }
        );
    }
}