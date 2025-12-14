/**
 * Image Upload API for A/B Testing
 * 
 * Handles image uploads for experiment modifications.
 * Stores images in Supabase Storage bucket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/auth';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = 'experiment-assets';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// CORS headers
function corsHeaders(origin: string | null) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders('*') });
}

/**
 * POST /api/experiments/upload
 * Upload an image for use in A/B test modifications
 * 
 * Body: FormData with 'file', 'siteId', and optionally 'experimentId'
 */
export async function POST(request: NextRequest) {
    const origin = request.headers.get('origin');

    try {
        // Authenticate user
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const siteId = formData.get('siteId') as string | null;
        const experimentId = formData.get('experimentId') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        if (!siteId) {
            return NextResponse.json(
                { error: 'siteId is required' },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400, headers: corsHeaders(origin) }
            );
        }

        // Verify user owns this site
        const { data: site } = await supabaseAdmin
            .from('sites')
            .select('user_id')
            .eq('id', siteId)
            .single();

        if (!site || site.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Unauthorized - site not found or not owned by user' },
                { status: 403, headers: corsHeaders(origin) }
            );
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'png';
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const filename = `${siteId}/${experimentId || 'general'}/${timestamp}-${randomId}.${ext}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage (private bucket)
        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error('[upload] Storage error:', error);
            return NextResponse.json(
                { error: 'Failed to upload file: ' + error.message },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        // Generate signed URL for private bucket (1 year expiry)
        const { data: signedUrlData, error: signedError } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year

        if (signedError || !signedUrlData) {
            console.error('[upload] Signed URL error:', signedError);
            return NextResponse.json(
                { error: 'Failed to generate access URL' },
                { status: 500, headers: corsHeaders(origin) }
            );
        }

        return NextResponse.json(
            {
                success: true,
                url: signedUrlData.signedUrl,
                path: data.path,
                filename: file.name,
                size: file.size,
                type: file.type,
            },
            { status: 200, headers: corsHeaders(origin) }
        );

    } catch (error) {
        console.error('[upload] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
