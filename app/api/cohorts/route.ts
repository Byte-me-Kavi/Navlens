import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndAuthorize, createUnauthenticatedResponse } from '@/lib/auth';
import { getClickHouseClient } from '@/lib/clickhouse';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Cohort {
    id: string;
    name: string;
    description: string;
    site_id: string;
    rules: CohortRule[];
    created_at: string;
    created_by: string;
}

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
    } catch (error) {
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

        const { data, error } = await supabase
            .from('cohorts')
            .insert({
                site_id: siteId,
                name: name.trim(),
                description: description?.trim() || '',
                rules: rules,
                created_by: authResult.user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[cohorts] Insert error:', error);
            return NextResponse.json({ error: 'Failed to create cohort' }, { status: 500 });
        }

        return NextResponse.json({ cohort: data }, { status: 201 });
    } catch (error) {
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

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

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
    } catch (error) {
        console.error('[cohorts] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
