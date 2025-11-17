import { createClient } from '@clickhouse/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Add proper type definitions instead of 'any'
interface ValidateResult {
  valid: boolean;
  error?: string;
}

interface SiteData {
  id: string;
  api_key: string;
}

interface ExcludedPathData {
  page_path: string;
}

interface EventData {
  site_id: string;
  page_path: string;
  [key: string]: unknown; // Allow additional properties
}

// Add CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

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
            url: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
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
async function validateSiteAndApiKey(siteId: string, apiKey: string): Promise<ValidateResult> {
    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from('sites')
            .select('id, api_key')
            .eq('id', siteId)
            .single();

        if (error) {
            console.warn(`[collect] Site validation FAILED for ${siteId}:`, error.message);
            return { valid: false, error: error.message };
        }

        if (!data) {
            console.warn(`[collect] Site validation FAILED: No data found for ${siteId}`);
            return { valid: false, error: 'No data found' };
        }

        // Verify API key matches
        const siteData = data as SiteData;
        if (siteData.api_key !== apiKey) {
            console.warn(`[collect] API key validation FAILED for ${siteId}: Key mismatch`);
            return { valid: false, error: 'API key mismatch' };
        }

        console.log(`[collect] Site and API key validation SUCCESS for ${siteId}`);
        return { valid: true };
    } catch (error) {
        console.error(`[collect] Unexpected error validating site ${siteId}:`, error);
        return { valid: false, error: 'Unexpected error' };
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[collect] Received request body keys:', Object.keys(body));
        
        // Extract API key from payload (should be at top level: { events: [...], api_key: "..." })
        const apiKey = body.api_key;
        if (!apiKey) {
            console.error('[collect] ❌ Missing api_key in request. Payload structure:', {
                hasEvents: !!body.events,
                hasApiKey: !!body.api_key,
                eventType: Array.isArray(body.events) ? 'array' : typeof body.events,
                payloadKeys: Object.keys(body),
            });
            return NextResponse.json(
                { message: 'Invalid request: missing api_key' },
                { status: 400, headers: corsHeaders() }
            );
        }
        
        console.log('[collect] ✓ Found api_key in request');
        
        // Handle both batched format { events: [...] } and legacy single event format
        let eventsArray: EventData[];
        if (body.events && Array.isArray(body.events)) {
            // New batched format from tracker.js
            console.log(`[collect] Processing batched format: ${body.events.length} events`);
            eventsArray = body.events;
        } else if (Array.isArray(body)) {
            // Array of events
            console.log(`[collect] Processing array format: ${body.length} events`);
            eventsArray = body;
        } else {
            // Single event object (legacy format)
            console.log('[collect] Processing single event format');
            eventsArray = [body];
        }

        if (eventsArray.length === 0) {
            return NextResponse.json(
                { message: 'No events provided' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // Extract site_id from the first event (all events should have the same site_id)
        const siteId = eventsArray[0]?.site_id;
        if (!siteId) {
            console.warn('[collect] Missing site_id in event data');
            return NextResponse.json(
                { message: 'Invalid event data: missing site_id' },
                { status: 400, headers: corsHeaders() }
            );
        }

        // SECURITY: Validate that the site_id exists and API key matches
        const { valid: isValidSiteAndKey, error } = await validateSiteAndApiKey(siteId, apiKey);
        if (!isValidSiteAndKey) {
            console.error(`[collect] REJECTED: Invalid site_id or API key mismatch for ${siteId}: ${error}`);
            return NextResponse.json(
                { message: 'Invalid site_id or api_key' },
                { status: 403, headers: corsHeaders() }
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
            
            if (!error && data && data.length > 0) {
                excludedPaths = new Set(data.map((d: ExcludedPathData) => d.page_path));
                console.log(`[collect] ✓ Loaded ${excludedPaths.size} excluded paths for site ${siteId}:`, Array.from(excludedPaths));
            } else if (!error && data && data.length === 0) {
                console.log('[collect] ℹ️ No excluded paths configured for this site');
            } else if (error && !error.message.includes('does not exist')) {
                console.warn('[collect] ⚠️ Error fetching excluded paths:', error.message);
            } else if (error && error.message.includes('does not exist')) {
                console.log('[collect] ℹ️ excluded_paths table does not exist');
            }
        } catch (err) {
            console.warn('[collect] ⚠️ Failed to fetch excluded paths:', err);
        }

        // Filter out events from excluded paths
        const filteredEvents = eventsArray.filter(event => {
            if (excludedPaths.has(event.page_path)) {
                console.log(`[collect] 🚫 Skipped event from excluded path: ${event.page_path}`);
                return false;
            }
            return true;
        });

        console.log(`[collect] Filtered to ${filteredEvents.length}/${eventsArray.length} event(s) after exclusion checks`);
        
        // If all events were filtered, just return 200 OK (graceful handling)
        // User wants to exclude these paths, so silently accepting is correct behavior
        if (filteredEvents.length === 0) {
            console.log('[collect] All events were from excluded paths (expected behavior - returning 200 OK)');
            return new Response(
                JSON.stringify({ 
                    success: true, 
                    message: 'All events were from excluded paths (silently discarded as configured)',
                    eventCount: 0
                }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders(),
                    },
                }
            );
        }
        
        // Perform the insertion into the 'events' table (only for non-excluded events)
        await clickhouseClient.insert({
            table: 'events',
            values: filteredEvents,
            format: 'JSONEachRow',
        });
        
        console.log(`[collect] Successfully inserted ${filteredEvents.length} event(s) for site ${siteId}`);
        
        // Return a successful response with CORS headers
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Events ingested successfully',
            eventCount: filteredEvents.length
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(),
            },
          }
        );
        
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to ingest events';
        console.error('[collect] Error ingesting events to ClickHouse:', error);
        // Return an error response with CORS headers
        return new Response(
          JSON.stringify({ error: errorMessage }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(),
            },
          }
        );
    }
}