import { createClient } from '@clickhouse/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase admin client for exclusion check
let supabaseAdminForExclusions: ReturnType<typeof createSupabaseClient> | null = null;
function getSupabaseAdminForExclusions() {
    if (!supabaseAdminForExclusions) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !key) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseAdminForExclusions = createSupabaseClient(supabaseUrl, key);
    }
    return supabaseAdminForExclusions;
}

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

// Validate that the site_id exists and API key matches
async function validateSiteAndApiKey(siteId: string, apiKey: string): Promise<boolean> {
    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('sites')
            .select('id, api_key')
            .eq('id', siteId)
            .single();

        if (error) {
            console.warn(`[collect] Site validation FAILED for ${siteId}:`, error.message);
            return false;
        }

        if (!data) {
            console.warn(`[collect] Site validation FAILED: No data found for ${siteId}`);
            return false;
        }

        // Verify API key matches
        if ((data as any).api_key !== apiKey) {
            console.warn(`[collect] API key validation FAILED for ${siteId}: Key mismatch`);
            return false;
        }

        console.log(`[collect] Site and API key validation SUCCESS for ${siteId}`);
        return true;
    } catch (error) {
        console.error(`[collect] Unexpected error validating site ${siteId}:`, error);
        return false;
    }
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
        
        // Extract API key from payload
        const apiKey = body.api_key;
        if (!apiKey) {
            console.warn('[collect] Missing api_key in request');
            return NextResponse.json(
                { message: 'Invalid request: missing api_key' },
                { status: 400 }
            );
        }
        
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

        // SECURITY: Validate that the site_id exists and API key matches
        const isValidSiteAndKey = await validateSiteAndApiKey(siteId, apiKey);
        if (!isValidSiteAndKey) {
            console.error(`[collect] REJECTED: Invalid site_id or API key mismatch for ${siteId}`);
            return NextResponse.json(
                { message: 'Invalid site_id or api_key' },
                { status: 403 }
            );
        }

        console.log(`[collect] Received ${eventsArray.length} event(s) for VALID site ${siteId}:`, JSON.stringify(eventsArray.slice(0, 1)));
        
        // Fetch excluded paths for this site from Supabase
        let excludedPaths: Set<string> = new Set();
        try {
            const supabase = getSupabaseAdminForExclusions();
            const { data, error } = await supabase
                .from('excluded_paths')
                .select('page_path')
                .eq('site_id', siteId);
            
            if (!error && data) {
                excludedPaths = new Set(data.map((d: any) => d.page_path));
                console.log(`[collect] Loaded ${excludedPaths.size} excluded paths for site ${siteId}`);
            } else if (error && !error.message.includes('does not exist')) {
                console.warn('[collect] Error fetching excluded paths:', error.message);
            }
        } catch (err) {
            console.warn('[collect] Failed to fetch excluded paths:', err);
        }

        // Filter out events from excluded paths
        const filteredEvents = eventsArray.filter(event => {
            if (excludedPaths.has(event.page_path)) {
                console.warn(`[collect] Rejected event from excluded path: ${event.page_path}`);
                return false;
            }
            return true;
        });

        if (filteredEvents.length === 0) {
            console.log('[collect] All events were from excluded paths, rejecting');
            return NextResponse.json(
                { message: 'All events are from excluded paths' },
                { status: 400 }
            );
        }

        console.log(`[collect] Filtered to ${filteredEvents.length} event(s) after exclusion checks`);
        
        // Perform the insertion into the 'events' table
        await clickhouseClient.insert({
            table: 'events',
            values: filteredEvents,
            format: 'JSONEachRow',
        });
        
        console.log(`[collect] Successfully inserted ${filteredEvents.length} event(s) for site ${siteId}`);
        
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