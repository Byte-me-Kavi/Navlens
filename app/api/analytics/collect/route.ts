import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';
import { supabase } from '@/lib/supabaseClient';
import { validators, ValidationError, validateRequestSize, ValidatedEventData } from '@/lib/validation';

// Initialize ClickHouse client
const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST!,
  username: process.env.CLICKHOUSE_USERNAME!,
  password: process.env.CLICKHOUSE_PASSWORD!,
  database: process.env.CLICKHOUSE_DATABASE!,
});

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
    const { data: siteData, error: siteError } = await supabase
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

    console.log(`Analytics data received for site: ${siteId}, owned by user: ${siteData.user_id}`);

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
        const validatedEvent = validators.validateEventData(events[i]);
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
        await clickhouse.insert({
          table: 'events',
          values: [{
            site_id: siteId,
            event_type: event.type,
            timestamp: new Date(event.timestamp),
            session_id: event.session_id,
            user_id: event.user_id || null,
            page_url: event.page_url || '',
            page_path: event.page_path || '',
            user_agent: event.user_agent || '',
            ip_address: clientIP,
            data: JSON.stringify(event.data || {}),
            created_at: new Date(),
          }],
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