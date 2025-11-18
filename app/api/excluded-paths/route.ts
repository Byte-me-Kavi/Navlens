import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

// --- Type Definitions ---
interface ExcludedPathRow {
  page_path: string;
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

// POST: Fetch excluded paths for a site OR add a new path to exclusion list
export async function POST(req: NextRequest) {
    try {
        // Authenticate user and get their authorized sites
        const authResult = await authenticateAndAuthorize(req);

        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath } = body;

        // Validate siteId parameter
        if (!siteId || typeof siteId !== 'string') {
            return NextResponse.json(
                { message: 'Missing or invalid siteId parameter' },
                { status: 400 }
            );
        }

        // Validate siteId format (UUID)
        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json(
                { message: 'Invalid siteId format' },
                { status: 400 }
            );
        }

        // Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        // If pagePath is provided, this is an ADD operation
        if (pagePath) {
            console.log(`[excluded-paths] POST: Adding path for site`);

            // Validate pagePath format
            if (!validators.isValidPagePath(pagePath)) {
                return NextResponse.json(
                    { message: 'Invalid pagePath format' },
                    { status: 400 }
                );
            }

            // Sanitize pagePath
            const sanitizedPagePath = validators.sanitizeString(pagePath, 1000);

            const supabase = getSupabaseAdminClient();

            // Add path to exclusion list
            const { data, error } = await supabase
                .from('excluded_paths')
                .insert([
                    {
                        site_id: siteId,
                        page_path: sanitizedPagePath,
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

            console.log(`[excluded-paths] POST: Path successfully added for site`);
            return NextResponse.json(
                { message: 'Path added to exclusion list', pagePath },
                { status: 200 }
            );
        }

        // If no pagePath provided, this is a FETCH operation
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
        console.error('[excluded-paths] POST Error:', error);
        return NextResponse.json(
            { message: 'Failed to process excluded paths request', error: errorMessage },
            { status: 500 }
        );
    }
}

// DELETE: Remove a path from the exclusion list
export async function DELETE(req: NextRequest) {
    try {
        // Authenticate user and get their authorized sites
        const authResult = await authenticateAndAuthorize(req);

        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { message: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        // Validate siteId format (UUID)
        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json(
                { message: 'Invalid siteId format' },
                { status: 400 }
            );
        }

        // Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
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
