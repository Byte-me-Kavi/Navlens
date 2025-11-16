import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// --- Type Definitions ---
interface ExcludedPathRow {
  page_path: string;
}

interface ExcludedPathRequest {
  siteId: string;
  pagePath: string;
}

// Initialize Supabase admin client
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

// GET: Check if a path is excluded/deleted for a site
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            return NextResponse.json(
                { message: 'Missing required parameter: siteId' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdminClient();

        // Fetch excluded paths for this site
        const { data, error } = await supabase
            .from('excluded_paths')
            .select('page_path')
            .eq('site_id', siteId);

        // If table doesn't exist yet, return empty array (graceful fallback)
        if (error && (error.message.includes('relation') || error.message.includes('does not exist'))) {
            return NextResponse.json({ excludedPaths: [] }, { status: 200 });
        }

        if (error) {
            throw error;
        }

        const excludedPaths = (data || []).map((d: ExcludedPathRow) => d.page_path);
        return NextResponse.json({ excludedPaths }, { status: 200 });
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[excluded-paths] GET Error:', error);
        return NextResponse.json(
            { message: 'Failed to fetch excluded paths', error: errorMessage },
            { status: 500 }
        );
    }
}

// POST: Add a path to the exclusion list
export async function POST(req: NextRequest) {
    try {
        const body: ExcludedPathRequest = await req.json();
        const { siteId, pagePath } = body;

        console.log(`[excluded-paths] POST: Adding path "${pagePath}" for site "${siteId}"`);

        if (!siteId || !pagePath) {
            console.error('[excluded-paths] POST: Missing parameters', { siteId, pagePath });
            return NextResponse.json(
                { message: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdminClient();

        // Add path to exclusion list
        const { data, error } = await supabase
            .from('excluded_paths')
            .insert([
                {
                    site_id: siteId,
                    page_path: pagePath,
                } as never
            ])
            .select();

        console.log(`[excluded-paths] POST: Insert response - Error: ${error ? 'YES' : 'NO'}, Data:`, data);

        // Ignore duplicate key errors
        if (error && (error.message.includes('Duplicate') || error.code === 'PGRST116' || error.message.includes('unique'))) {
            console.log(`[excluded-paths] POST: Path already excluded (duplicate key)`);
            return NextResponse.json(
                { message: 'Path already excluded', pagePath },
                { status: 200 }
            );
        }

        if (error) {
            console.error('[excluded-paths] POST: Supabase error:', {
                message: error.message,
                code: (error as { code?: string }).code,
                hint: (error as { hint?: string }).hint,
                details: (error as { details?: string }).details,
            });
            throw error;
        }

        console.log(`[excluded-paths] POST: Path "${pagePath}" successfully added for site "${siteId}"`);
        return NextResponse.json(
            { message: 'Path added to exclusion list', pagePath },
            { status: 200 }
        );
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[excluded-paths] POST Error:', error);
        return NextResponse.json(
            { message: 'Failed to exclude path', error: errorMessage },
            { status: 500 }
        );
    }
}

// DELETE: Remove a path from the exclusion list
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { siteId, pagePath } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { message: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdminClient();

        // Remove path from exclusion list
        const { error } = await supabase
            .from('excluded_paths')
            .delete()
            .eq('site_id', siteId)
            .eq('page_path', pagePath);

        if (error && !error.message.includes('does not exist')) {
            throw error;
        }

        return NextResponse.json(
            { message: 'Path removed from exclusion list', pagePath },
            { status: 200 }
        );
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[excluded-paths] DELETE Error:', error);
        return NextResponse.json(
            { message: 'Failed to remove exclusion', error: errorMessage },
            { status: 500 }
        );
    }
}
