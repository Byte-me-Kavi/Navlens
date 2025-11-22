import { NextRequest, NextResponse } from 'next/server';
import { createClient as createClickHouseClient } from '@clickhouse/client';
import { createClient } from '@supabase/supabase-js';
import { validators, ValidationError, validateRequestSize, ValidatedEventData } from '@/lib/validation';

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize ClickHouse client
function createClickHouseConfig() {
  const url = process.env.CLICKHOUSE_URL;
  if (url) {
    // Parse ClickHouse URL: https://username:password@host:port/database
    const urlPattern = /^https?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(urlPattern);
    if (match) {
      const [, username, password, host, port, database] = match;
      return {
        host: `https://${host}:${port}`,
        username,
        password,
        database,
      };
    }
  }
}

const clickhouse = createClickHouseClient(createClickHouseConfig());

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // requests per minute per IP
const SITE_RATE_LIMIT_MAX_REQUESTS = 1000; // requests per minute per site

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

function checkSiteRateLimit(siteId: string): boolean {
  const now = Date.now();
  const siteKey = `site_${siteId}`;
  const siteLimit = rateLimitStore.get(siteKey);

  if (!siteLimit || now > siteLimit.resetTime) {
    rateLimitStore.set(siteKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (siteLimit.count >= SITE_RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  siteLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Validate request size (max 1MB)
    if (!validateRequestSize(request, 1)) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    // Validate IP format
    if (!validators.isValidIP(clientIP) && clientIP !== 'unknown') {
      console.warn(`Invalid IP format: ${clientIP}`);
    }

    // Rate limiting check
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { events, siteId } = body;

    // Validate required fields with proper type checking
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: events must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: siteId must be a string' },
        { status: 400 }
      );
    }

    // Validate siteId format (UUID)
    if (!validators.isValidUUID(siteId)) {
      console.warn(`Invalid siteId format attempted: ${siteId}`);
      return NextResponse.json(
        { error: 'Invalid site ID format' },
        { status: 400 }
      );
    }

    // Limit number of events per request
    if (events.length > 100) {
      return NextResponse.json(
        { error: 'Too many events in single request (max 100)' },
        { status: 400 }
      );
    }

    // Validate siteId exists in our system and is active
    // This prevents unauthorized data collection for non-existent or inactive sites
    const { data: siteData, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, user_id')
      .eq('id', siteId)
      .single();

    if (siteError || !siteData) {
      console.warn(`Invalid site ID attempted: ${siteId}`, siteError?.message);
      return NextResponse.json(
        { error: 'Invalid site ID' },
        { status: 403 }
      );
    }

    console.log(`Analytics data received and processed for site`);

    // Additional rate limiting per site to prevent abuse
    if (!checkSiteRateLimit(siteId)) {
      console.warn(`Site rate limit exceeded for site: ${siteId}`);
      return NextResponse.json(
        { error: 'Site rate limit exceeded' },
        { status: 429 }
      );
    }

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
      return NextResponse.json(
        { error: 'No valid events to process after validation' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      processed: validEvents.length
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}