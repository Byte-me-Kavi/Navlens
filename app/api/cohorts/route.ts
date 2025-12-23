import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndAuthorize, createUnauthenticatedResponse } from '@/lib/auth';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CohortRule {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
    value: string | number;
    value2?: string | number; // For 'between' operator
}

// GET - List cohorts for a site
export async function GET(request: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized) {
            return createUnauthenticatedResponse();
        }

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');

        if (!siteId || !authResult.userSites.includes(siteId)) {
            return NextResponse.json({ error: 'Unauthorized or invalid siteId' }, { status: 403 });
        }

        try {
            const { data, error } = await supabase
                .from('cohorts')
                .select('*')
                .eq('site_id', siteId)
                .order('created_at', { ascending: false });

            if (error) {
                // Table might not exist yet - return empty array
                console.warn('[cohorts] Query error (table may not exist):', error.message);
                return NextResponse.json({ cohorts: [], tableNotFound: true });
            }

            return NextResponse.json({ cohorts: data || [] });
        } catch (queryError) {
            console.warn('[cohorts] Query failed:', queryError);
            return NextResponse.json({ cohorts: [], tableNotFound: true });
        }
    } catch (error: unknown) {
        console.error('[cohorts] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new cohort
export async function POST(request: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized || !authResult.user) {
            return createUnauthenticatedResponse();
        }

        const body = await request.json();
        const { siteId, name, description, rules } = body;

        if (!siteId || !authResult.userSites.includes(siteId)) {
            return NextResponse.json({ error: 'Unauthorized or invalid siteId' }, { status: 403 });
        }

        if (!name || !rules || !Array.isArray(rules)) {
            return NextResponse.json({ error: 'name and rules are required' }, { status: 400 });
        }

        // Valid fields from ClickHouse events table that can be used for cohort rules
        const VALID_FIELDS: Record<string, {
            type: 'string' | 'number' | 'boolean';
            operators: string[];
            allowedValues?: string[];  // For fields with specific allowed values
        }> = {
            device_type: { type: 'string', operators: ['equals', 'contains'], allowedValues: ['desktop', 'mobile', 'tablet'] },
            country: { type: 'string', operators: ['equals', 'contains'] },
            page_views: { type: 'number', operators: ['equals', 'greater_than', 'less_than'] },
            session_duration: { type: 'number', operators: ['equals', 'greater_than', 'less_than'] },
            has_rage_clicks: { type: 'boolean', operators: ['equals'], allowedValues: ['true', 'false'] },
            first_seen: { type: 'string', operators: ['equals', 'greater_than', 'less_than'] },
            // Additional valid fields from ClickHouse schema
            page_path: { type: 'string', operators: ['equals', 'contains'] },
            referrer: { type: 'string', operators: ['equals', 'contains'] },
            user_agent: { type: 'string', operators: ['equals', 'contains'] },
            viewport_width: { type: 'number', operators: ['equals', 'greater_than', 'less_than'] },
            viewport_height: { type: 'number', operators: ['equals', 'greater_than', 'less_than'] },
        };

        // Validate each rule
        const errors: string[] = [];
        for (const rule of rules as CohortRule[]) {
            const fieldConfig = VALID_FIELDS[rule.field];

            if (!fieldConfig) {
                errors.push(`Invalid field "${rule.field}". Valid fields: ${Object.keys(VALID_FIELDS).join(', ')}`);
                continue;
            }

            if (!fieldConfig.operators.includes(rule.operator)) {
                errors.push(`Invalid operator "${rule.operator}" for field "${rule.field}". Valid operators: ${fieldConfig.operators.join(', ')}`);
            }

            // Type validation
            if (fieldConfig.type === 'number' && typeof rule.value === 'string' && !/^\d+$/.test(rule.value)) {
                errors.push(`Field "${rule.field}" requires a numeric value, got "${rule.value}"`);
            }

            // Allowed values validation
            if (fieldConfig.allowedValues && rule.operator === 'equals') {
                const valueStr = String(rule.value).toLowerCase();
                if (!fieldConfig.allowedValues.includes(valueStr)) {
                    errors.push(`Invalid value "${rule.value}" for field "${rule.field}". Allowed values: ${fieldConfig.allowedValues.join(', ')}`);
                }
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({
                error: 'Invalid cohort rules',
                details: errors,
                validFields: Object.keys(VALID_FIELDS),
                hint: 'Use AI Create to automatically generate valid cohort rules from natural language.'
            }, { status: 400 });
        }

        console.log('[cohorts] Creating cohort:', { siteId, name, rulesCount: rules.length, userId: authResult.user.id });

        const { data, error } = await supabase
            .from('cohorts')
            .insert({
                site_id: siteId,
                name: name.trim(),
                description: description?.trim() || '',
                rules: rules,
            })
            .select()
            .single();

        if (error) {
            console.error('[cohorts] Insert error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
            if (error.code === '42P01') {
                return NextResponse.json({ error: 'Cohorts table does not exist. Please create it in Supabase.' }, { status: 500 });
            }
            return NextResponse.json({ error: `Failed to create cohort: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ cohort: data }, { status: 201 });
    } catch (error: unknown) {
        console.error('[cohorts] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a cohort
export async function DELETE(request: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized || !authResult.user) {
            return createUnauthenticatedResponse();
        }

        // Read id from request body
        const body = await request.json();
        const id = body.id;

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('cohorts')
            .select('site_id')
            .eq('id', id)
            .single();

        if (!existing || !authResult.userSites.includes(existing.site_id)) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }

        const { error } = await supabase
            .from('cohorts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[cohorts] Delete error:', error);
            return NextResponse.json({ error: 'Failed to delete cohort' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[cohorts] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
