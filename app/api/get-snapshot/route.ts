import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Shared logic for processing snapshot requests
async function processSnapshotRequest(siteId: string, pagePath: string, deviceType: string): Promise<NextResponse> {
    console.log('=== Snapshot Request Details ===');
    console.log('Site ID:', siteId);
    console.log('Page Path:', pagePath);
    console.log('Device Type:', deviceType);

    if (!siteId || !pagePath || !deviceType) {
        console.error('❌ Missing required parameters:', { siteId, pagePath, deviceType });
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Normalize path to match upload logic
    const normalizedPath = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '_');
    const filePath = `${siteId}/${deviceType}/${normalizedPath}.json`;
    console.log('📁 Constructed file path:', filePath);
    console.log('📁 Full Supabase path: snapshots/' + filePath);

    // Download the JSON file
    console.log('Attempting to download from Supabase storage bucket: snapshots');
    const { data, error } = await supabase.storage
        .from('snapshots')
        .download(filePath);

    if (error) {
        console.error('Snapshot download error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return NextResponse.json({ 
            error: 'Snapshot not found', 
            details: error.message,
            filePath 
        }, { status: 404 });
    }

    console.log('Downloaded successfully, data size:', data.size);

    // Parse the Blob/File into JSON
    const text = await data.text();
    console.log('Downloaded text length:', text.length);
    console.log('Text preview:', text.substring(0, 200));
    
    const json = JSON.parse(text);
    console.log('JSON parsed successfully, keys:', Object.keys(json));

    console.log('Returning snapshot data');
    return encryptedJsonResponse(json, { 
        status: 200, 
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });
}

/**
 * POST handler - Preferred method for security (data in body, not URL)
 */
export async function POST(req: NextRequest) {
    try {
        console.log('=== Get Snapshot API Called (POST) ===');
        
        // Authenticate user first
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const siteId = body.siteId;
        const pagePath = body.pagePath;
        const deviceType = body.deviceType;

        // Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        return await processSnapshotRequest(siteId, pagePath, deviceType);

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = err.message.includes('Network') || err.message.includes('ECONNREFUSED') ? 503 : 500;
        console.error('Get snapshot error:', err);
        console.error('Error stack:', err.stack);
        return NextResponse.json({
            error: 'Internal server error',
            details: err.message
        }, { status });
    }
}

/**
 * GET handler - Deprecated, use POST for security
 * Kept for backward compatibility
 */
export async function GET(req: NextRequest) {
    console.warn('⚠️ GET request to /api/get-snapshot is deprecated. Use POST for security.');
    
    try {
        console.log('=== Get Snapshot API Called (GET - Deprecated) ===');
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId') || '';
        const pagePath = searchParams.get('pagePath') || '';
        const deviceType = searchParams.get('deviceType') || '';

        return await processSnapshotRequest(siteId, pagePath, deviceType);

    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const status = err.message.includes('Network') || err.message.includes('ECONNREFUSED') ? 503 : 500;
        console.error('Get snapshot error (GET):', err);
        return NextResponse.json({
            error: 'Internal server error',
            details: err.message
        }, { status });
    }
}
