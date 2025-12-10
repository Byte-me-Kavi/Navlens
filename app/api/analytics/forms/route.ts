import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validators } from '@/lib/validation';
import { getClickHouseClient } from '@/lib/clickhouse';

// Types for form analytics
interface FormSummary {
    form_id: string;
    form_url: string;
    total_sessions: number;
    total_submissions: number;
    total_abandons: number;
    completion_rate: number;
    avg_time_seconds: number;
    last_activity: string;
}

interface FieldMetrics {
    field_id: string;
    field_name: string;
    field_type: string;
    field_index: number;
    focus_count: number;
    blur_count: number;
    submit_count: number;
    abandon_count: number;
    refill_count: number;
    avg_time_ms: number;
    drop_off_rate: number;
    refill_rate: number;
}

interface FormAnalyticsResponse {
    forms?: FormSummary[];
    fields?: FieldMetrics[];
    summary?: {
        total_forms: number;
        total_submissions: number;
        avg_completion_rate: number;
    };
}

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ClickHouse client
const clickhouse = getClickHouseClient();

// In-memory cache
const analyticsCache = new Map<string, { data: FormAnalyticsResponse; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(siteId: string, formId: string | null, dateRange: string): string {
    return `${siteId}:${formId || 'all'}:${dateRange}`;
}

function getFromCache(key: string): FormAnalyticsResponse | null {
    const cached = analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }
    analyticsCache.delete(key);
    return null;
}

function setCache(key: string, data: FormAnalyticsResponse): void {
    analyticsCache.set(key, { data, timestamp: Date.now() });
    // Cleanup old entries
    if (analyticsCache.size > 50) {
        const entries = Array.from(analyticsCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, 25).forEach(([k]) => analyticsCache.delete(k));
    }
}

// CORS headers
function addCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=120');
    return response;
}

export async function OPTIONS() {
    return addCorsHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const formId = searchParams.get('formId');
        const days = parseInt(searchParams.get('days') || '7');
        const includeFields = searchParams.get('fields') === 'true';

        // Validate siteId
        if (!siteId || !validators.isValidUUID(siteId)) {
            return addCorsHeaders(
                NextResponse.json({ error: 'siteId is required' }, { status: 400 })
            );
        }

        // Check cache
        const cacheKey = getCacheKey(siteId, formId, `${days}d`);
        const cached = getFromCache(cacheKey);
        if (cached) {
            console.log(`[analytics/forms] Cache hit for ${cacheKey}`);
            return addCorsHeaders(NextResponse.json(cached));
        }

        // Verify site access
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

        const response: FormAnalyticsResponse = {};

        // If no formId, get list of forms with summary
        if (!formId) {
            const formsQuery = `
        SELECT 
          form_id,
          any(form_url) as form_url,
          uniqExact(session_id) as total_sessions,
          countIf(interaction_type = 'submit') as total_submissions,
          countIf(interaction_type = 'abandon') as total_abandons,
          round(countIf(interaction_type = 'submit') / greatest(uniqExact(session_id), 1) * 100, 1) as completion_rate,
          round(avg(time_spent_ms) / 1000, 1) as avg_time_seconds,
          max(timestamp) as last_activity
        FROM form_interactions
        WHERE site_id = {siteId:String}
          AND timestamp >= now() - INTERVAL {days:Int32} DAY
        GROUP BY form_id
        ORDER BY total_sessions DESC
        LIMIT 50
      `;

            const formsResult = await clickhouse.query({
                query: formsQuery,
                query_params: { siteId, days },
                format: 'JSONEachRow',
            });

            const formsData = await formsResult.json();
            response.forms = formsData as FormSummary[];

            // Add summary
            if (response.forms && response.forms.length > 0) {
                response.summary = {
                    total_forms: response.forms.length,
                    total_submissions: response.forms.reduce((sum, f) => sum + (f.total_submissions || 0), 0),
                    avg_completion_rate: response.forms.reduce((sum, f) => sum + (f.completion_rate || 0), 0) / response.forms.length,
                };
            }
        }

        // If formId specified or includeFields, get field-level metrics
        if (formId || includeFields) {
            const targetFormId = formId || (response.forms && response.forms[0]?.form_id);

            if (targetFormId) {
                const fieldsQuery = `
          SELECT 
            field_id,
            any(field_name) as field_name,
            any(field_type) as field_type,
            any(field_index) as field_index,
            countIf(interaction_type = 'focus') as focus_count,
            countIf(interaction_type = 'blur') as blur_count,
            countIf(interaction_type = 'submit') as submit_count,
            countIf(interaction_type = 'abandon') as abandon_count,
            countIf(was_refilled = true) as refill_count,
            round(avg(time_spent_ms), 0) as avg_time_ms
          FROM form_interactions
          WHERE site_id = {siteId:String}
            AND form_id = {formId:String}
            AND timestamp >= now() - INTERVAL {days:Int32} DAY
          GROUP BY field_id
          ORDER BY field_index ASC
        `;

                const fieldsResult = await clickhouse.query({
                    query: fieldsQuery,
                    query_params: { siteId, formId: targetFormId, days },
                    format: 'JSONEachRow',
                });

                const fieldsData = await fieldsResult.json() as FieldMetrics[];

                // Calculate drop-off and refill rates
                let prevFocusCount = 0;
                response.fields = fieldsData.map((field, idx) => {
                    const dropOffRate = idx === 0
                        ? 0
                        : prevFocusCount > 0
                            ? Math.round((1 - field.focus_count / prevFocusCount) * 100)
                            : 0;
                    const refillRate = field.blur_count > 0
                        ? Math.round((field.refill_count / field.blur_count) * 100)
                        : 0;

                    prevFocusCount = field.focus_count;

                    return {
                        ...field,
                        drop_off_rate: dropOffRate,
                        refill_rate: refillRate,
                    };
                });
            }
        }

        // Cache response
        setCache(cacheKey, response);

        console.log(`[analytics/forms] Returning data for site ${siteId}`);
        return addCorsHeaders(NextResponse.json(response));

    } catch (error) {
        console.error('[analytics/forms] Error:', error);
        return addCorsHeaders(
            NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        );
    }
}
