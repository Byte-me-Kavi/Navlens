import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators, ValidationError, validateRequestSize, ValidatedEventData, EventData } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';
import { checkRateLimits, isRedisAvailable } from '@/lib/ratelimit';
import { parseRequestBody } from '@/lib/decompress';
import { validateSiteAndOrigin, addTrackerCorsHeaders, createPreflightResponse } from '@/lib/trackerCors';

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
  return createPreflightResponse(origin);
}

// Helper to create JSON response with CORS headers
function jsonResponse(data: object, status: number = 200, origin: string | null = null, isAllowed: boolean = true): NextResponse {
  const response = NextResponse.json(data, { status });
  return addTrackerCorsHeaders(response, origin, isAllowed);
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

    // Parse body - handles both gzip compressed and regular JSON
    const body = await parseRequestBody<{ events: unknown[]; siteId: string }>(request);
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

    // Validate siteId exists in our system AND origin is allowed
    const validation = await validateSiteAndOrigin(siteId, origin);

    if (!validation.valid) {
      console.warn(`[v1/ingest] Invalid site ID: ${siteId}`);
      return jsonResponse({ error: 'Invalid site ID' }, 403, origin, false);
    }

    if (!validation.allowed) {
      // Check if tracking is paused specifically
      if (validation.valid && !validation.isTrackingEnabled) {
        console.log(`[v1/ingest] Tracking paused for site ${siteId}, dropping events`);
        // Return success silently so tracker doesn't retry
        return jsonResponse({ success: true, processed: 0, reason: 'tracking_paused' }, 200, origin);
      }
      console.warn(`[v1/ingest] Origin ${origin} not allowed for site ${siteId}`);
      // Return without CORS headers - browser will block
      return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    console.log(`[v1/ingest] Processing ${events.length} events for site ${siteId}`);

    // Process and validate events with comprehensive validation
    const validEvents: ValidatedEventData[] = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < events.length; i++) {
      try {
        const rawEvent = events[i] as EventData;
        // Debug log to see what's coming in
        console.log('📥 Raw event received:', JSON.stringify(rawEvent, null, 2));
        console.log('📥 Raw event.data:', JSON.stringify(rawEvent?.data, null, 2));
        console.log('📥 document_width in event.data?:', rawEvent?.data?.document_width);
        console.log('📥 document_height in event.data?:', rawEvent?.data?.document_height);
        const validatedEvent = validators.validateEventData(rawEvent);
        console.log('✅ Validated event:', JSON.stringify(validatedEvent, null, 2));
        console.log('✅ Validated event.data:', JSON.stringify(validatedEvent.data, null, 2));
        validEvents.push(validatedEvent);
      } catch (error: unknown) {
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

    // --- SESSION LIMIT ENFORCEMENT START ---
    // Check if this is a new session (we track unique session_ids)
    // Get userId from site for session tracking
    const { data: siteData } = await supabaseAdmin
      .from('sites')
      .select('user_id')
      .eq('id', siteId)
      .single();

    if (siteData?.user_id && validEvents.length > 0) {
      const sessionId = validEvents[0].session_id;

      // Check if this is a new session by querying ClickHouse
      const sessionCheckQuery = `
        SELECT COUNT(*) as count
        FROM events
        WHERE site_id = {siteId:String}
          AND session_id = {sessionId:String}
        LIMIT 1
      `;

      const sessionCheckResult = await clickhouse.query({
        query: sessionCheckQuery,
        query_params: { siteId, sessionId },
        format: 'JSON'
      });

      const sessionCheckData = await sessionCheckResult.json();
      const isNewSession = (sessionCheckData.data?.[0] as { count: number })?.count === 0;
      // Check if this is a new session by querying ClickHouse
      // Note: We used to query ClickHouse here.
      // Assuming isNewSession logic remains same as above...

      if (isNewSession) {
        // Import usage tracker
        const { getUserPlanLimits, incrementSessionCount } = await import('@/lib/usage-tracker/counter');

        // Get limits first
        const limits = await getUserPlanLimits(siteData.user_id);

        // Attempt atomic increment with limit enforcement
        const result = await incrementSessionCount(siteData.user_id, limits.sessions);

        if (!result.success) {
          console.warn(`[v1/ingest] Session limit reached for user ${siteData.user_id}`);
          // Return 403 but creating a valid "limit_reached" event might be better?
          // For now, we reject the ingestion of the session-start event or just log it?
          // If we reject, the session isn't tracked.
          return NextResponse.json({
            error: 'Session limit reached',
            code: 'LIMIT_REACHED'
          }, { status: 403 });
        }

        console.log(`[v1/ingest] New session tracked for user ${siteData.user_id}`);
      }
    }
    // --- SESSION LIMIT ENFORCEMENT END ---

    // Insert events into ClickHouse
    const clickhouseInsertData = validEvents.map((event: ValidatedEventData) => ({
      site_id: siteId,
      event_id: event.data?.event_id || crypto.randomUUID(),
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
      country: request.headers.get('x-vercel-ip-country') || 'Unknown',
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
      // Additional element tracking fields
      element_href: event.data?.element_href || '',
      is_interactive: event.data?.is_interactive ?? false,
      is_dead_click: event.data?.is_dead_click ?? false,
      click_count: event.data?.click_count ?? 0,
      // Behavioral metrics columns
      confusion_scroll_score: typeof event.data?.confusion_scroll_score === 'number' ? event.data.confusion_scroll_score : 0,
      hover_duration_ms: typeof event.data?.hover_duration_ms === 'number' ? event.data.hover_duration_ms : 0,
      cursor_path_distance: typeof event.data?.cursor_path_distance === 'number' ? event.data.cursor_path_distance : 0,
      cursor_direction_changes: typeof event.data?.cursor_direction_changes === 'number' ? event.data.cursor_direction_changes : 0,
      is_erratic_movement: event.data?.is_erratic_movement ?? false,
      attention_zone: typeof event.data?.attention_zone === 'string' ? event.data.attention_zone : '',
      // A/B Testing experiment tracking
      experiment_ids: Array.isArray(event.experiment_ids) ? event.experiment_ids : [],
      variant_ids: Array.isArray(event.variant_ids) ? event.variant_ids : [],
      created_at: new Date(),
    }));

    if (clickhouseInsertData.length > 0) {
      console.log(`💾 Bulk inserting ${clickhouseInsertData.length} events into ClickHouse`);
      await clickhouse.insert({
        table: 'events',
        values: clickhouseInsertData,
        format: 'JSONEachRow',
      });
    }

    // Batch insert completed (or failed if exception thrown)


    // --- SIGNAL SYNC TO POSTGRES (For Session Replay) ---
    // Log all event types for debugging
    console.log('[v1/ingest] All event types in batch:', validEvents.map(e => e.type));

    // If we detect signals, sync them to Postgres so they appear in sessions_view
    const signalEvents = validEvents.filter(e =>
      e.type === 'rage_click' ||
      e.type === 'dead_click' ||
      (e.type === 'custom' && ['u_turn', 'quick_exit'].includes((e.data?.event_name as string) || ''))
    );

    console.log(`[v1/ingest] Detected ${signalEvents.length} signal events`);

    if (signalEvents.length > 0) {
      console.log(`[v1/ingest] Syncing ${signalEvents.length} signals to Postgres for session ${validEvents[0].session_id}`);

      // Group signals by session (though usually batch is for one session)
      const signalsBySession = signalEvents.reduce((acc, event) => {
        if (!acc[event.session_id]) acc[event.session_id] = [];

        // Format for Postgres JSONB
        acc[event.session_id].push({
          type: event.type === 'custom' ? (event.data?.event_name as string) : event.type,
          timestamp: event.timestamp,
          data: event.data || {}
        });
        return acc;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, {} as Record<string, any[]>);

      // Insert into Postgres (one row per session-batch)
      const postgresPromises = Object.entries(signalsBySession).map(async ([sessionId, signals]) => {
        // Find a representative event for metadata
        const metaEvent = validEvents.find(e => e.session_id === sessionId) || validEvents[0];

        return supabaseAdmin
          .from('rrweb_events')
          .insert({
            site_id: siteId,
            session_id: sessionId,
            visitor_id: metaEvent.client_id || '', // Map client_id to visitor_id
            page_path: metaEvent.page_path || '',
            events: [], // Empty events - we only care about signals here
            timestamp: new Date().toISOString(),
            session_signals: signals,
            // Minimal metadata to satisfy constraints if any (schema allows nulls mostly)
            device_type: metaEvent.device_type,
            country: request.headers.get('x-vercel-ip-country') || 'Unknown',
            ip_address: clientIP
          })
          .then(({ error }) => {
            if (error) console.error('[v1/ingest] Failed to sync signals to Postgres:', error);
            else console.log(`[v1/ingest] Successfully synced signals for session ${sessionId}`);
          });
      });

      await Promise.allSettled(postgresPromises);
    }

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

  } catch (error: unknown) {
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