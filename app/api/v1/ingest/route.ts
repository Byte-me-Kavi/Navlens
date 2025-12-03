import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators, ValidationError, validateRequestSize, ValidatedEventData } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';
import { checkRateLimits, isRedisAvailable } from '@/lib/ratelimit';

// Helper to add CORS headers to response with dynamic origin
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  // CRITICAL: When Access-Control-Allow-Credentials is true, we CANNOT use wildcard '*'
  // We must either:
  // 1. Return the specific requesting origin, OR
  // 2. Not include credentials header and use '*'
  
  if (origin) {
    // If we have an origin, use it specifically (required for credentials)
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    // If no origin (e.g., same-origin requests, curl, etc.), allow all without credentials
    response.headers.set('Access-Control-Allow-Origin', '*');
    // Don't set Allow-Credentials when using wildcard
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get the singleton ClickHouse client
const clickhouse = getClickHouseClient();

// Log rate limiting backend on startup
console.log(`[v1/ingest] Rate limiting backend: ${isRedisAvailable() ? 'Upstash Redis' : 'In-memory (development)'}`);

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return addCorsHeaders(new NextResponse(null, { status: 204 }), origin);
}

// Helper to create JSON response with CORS headers
function jsonResponse(data: object, status: number = 200, origin?: string | null): NextResponse {
  const response = NextResponse.json(data, { status });
  return addCorsHeaders(response, origin);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const origin = request.headers.get('origin');
  
  try {
    // Validate request size (max 1MB)
    if (!validateRequestSize(request, 1)) {
      return jsonResponse({ error: 'Request too large' }, 413, origin);
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    // Validate IP format
    if (!validators.isValidIP(clientIP) && clientIP !== 'unknown') {
      console.warn(`[v1/ingest] Invalid IP format: ${clientIP}`);
    }

    // Parse body first to get siteId for combined rate limiting
    const body = await request.json();
    const { events, siteId } = body;

    // Validate required fields with proper type checking
    if (!events || !Array.isArray(events) || events.length === 0) {
      return jsonResponse({ error: 'Invalid request: events must be a non-empty array' }, 400, origin);
    }

    if (!siteId || typeof siteId !== 'string') {
      return jsonResponse({ error: 'Invalid request: siteId must be a string' }, 400, origin);
    }

    // Validate siteId format (UUID)
    if (!validators.isValidUUID(siteId)) {
      console.warn(`[v1/ingest] Invalid siteId format: ${siteId}`);
      return jsonResponse({ error: 'Invalid site ID format' }, 400, origin);
    }

    // Combined rate limiting check (IP + site)
    const rateLimitResult = await checkRateLimits(clientIP, siteId);
    if (!rateLimitResult.allowed) {
      const response = jsonResponse({ error: rateLimitResult.reason || 'Rate limit exceeded' }, 429, origin);
      // Add rate limit headers
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Limit number of events per request
    if (events.length > 100) {
      return jsonResponse({ error: 'Too many events in single request (max 100)' }, 400, origin);
    }

    // Validate siteId exists in our system and is active
    // This prevents unauthorized data collection for non-existent or inactive sites
    const { data: siteData, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, user_id')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) {
      console.warn(`[v1/ingest] Invalid site ID: ${siteId}`, siteError?.message);
      return jsonResponse({ error: 'Invalid site ID' }, 403, origin);
    }

    console.log(`[v1/ingest] Processing ${events.length} events for site ${siteId}`);

    // Process and validate events with comprehensive validation
    const validEvents: ValidatedEventData[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        // Debug log to see what's coming in
        console.log('📥 Raw event received:', JSON.stringify(events[i], null, 2));
        console.log('📥 Raw event.data:', JSON.stringify(events[i].data, null, 2));
        console.log('📥 document_width in event.data?:', events[i].data?.document_width);
        console.log('📥 document_height in event.data?:', events[i].data?.document_height);
        const validatedEvent = validators.validateEventData(events[i]);
        console.log('✅ Validated event:', JSON.stringify(validatedEvent, null, 2));
        console.log('✅ Validated event.data:', JSON.stringify(validatedEvent.data, null, 2));
        validEvents.push(validatedEvent);
      } catch (error) {
        const errorMsg = error instanceof ValidationError ? error.message : 'Unknown validation error';
        validationErrors.push(`Event ${i}: ${errorMsg}`);
        console.warn(`Event validation failed for event ${i}:`, errorMsg);
      }
    }

    // Log validation errors but continue with valid events
    if (validationErrors.length > 0) {
      console.warn(`Validation errors in request: ${validationErrors.join(', ')}`);
    }

    if (validEvents.length === 0) {
      return jsonResponse({ error: 'No valid events to process after validation' }, 400, origin);
    }

    // Insert events into ClickHouse
    const insertPromises = validEvents.map(async (event: ValidatedEventData) => {
      try {
        const insertData = {
          site_id: siteId,
          event_type: event.type,
          timestamp: new Date(event.timestamp),
          session_id: event.session_id,
          user_id: event.user_id || null,
          page_url: event.page_url || '',
          page_path: event.page_path || '',
          referrer: event.referrer || '',
          user_agent: event.user_agent || '',
          user_language: event.user_language || '',
          viewport_width: event.viewport_width || 0,
          viewport_height: event.viewport_height || 0,
          screen_width: event.screen_width || 0,
          screen_height: event.screen_height || 0,
          device_type: event.device_type || '',
          client_id: event.client_id || '',
          load_time: event.load_time || 0,
          ip_address: clientIP,
          // Flatten event.data fields
          x: event.data?.x ?? 0,
          y: event.data?.y ?? 0,
          x_relative: event.data?.x_relative ?? 0,
          y_relative: event.data?.y_relative ?? 0,
          scroll_depth: event.data?.scroll_depth ?? 0,
          document_width: event.data?.document_width ?? 0,
          document_height: event.data?.document_height ?? 0,
          element_id: event.data?.element_id || '',
          element_classes: event.data?.element_classes || '',
          element_tag: event.data?.element_tag || '',
          element_text: event.data?.element_text || '',
          element_selector: event.data?.element_selector || '',
          created_at: new Date(),
        };
        
        console.log('💾 Inserting into ClickHouse:', JSON.stringify(insertData, null, 2));
        
        await clickhouse.insert({
          table: 'events',
          values: [insertData],
          format: 'JSONEachRow',
        });
      } catch (error) {
        console.error('Failed to insert event:', error);
        // Continue processing other events even if one fails
      }
    });

    await Promise.allSettled(insertPromises);

    const duration = Date.now() - startTime;
    console.log(`[v1/ingest] Processed ${validEvents.length} events in ${duration}ms`);

    // Add rate limit headers to success response
    const response = jsonResponse({
      success: true,
      processed: validEvents.length,
      duration_ms: duration
    }, 200, origin);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;

  } catch (error) {
    console.error('[v1/ingest] Error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500, origin);
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return jsonResponse({
    status: 'healthy',
    rateLimit: isRedisAvailable() ? 'redis' : 'memory',
    timestamp: new Date().toISOString()
  }, 200, origin);
}