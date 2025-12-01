import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { encryptedJsonResponse } from '@/lib/encryption';

const gunzipAsync = promisify(gunzip);

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
    
    // Try compressed file first (.json.gz), fallback to uncompressed (.json)
    const compressedPath = `${siteId}/${deviceType}/${normalizedPath}.json.gz`;
    const uncompressedPath = `${siteId}/${deviceType}/${normalizedPath}.json`;
    
    console.log('📁 Trying compressed path first:', compressedPath);

    // Try compressed version first
    let { data, error } = await supabase.storage
        .from('snapshots')
        .download(compressedPath);
    
    let isCompressed = true;
    
    if (error) {
        console.log('Compressed file not found, trying uncompressed:', uncompressedPath);
        isCompressed = false;
        
        const uncompressedResult = await supabase.storage
            .from('snapshots')
            .download(uncompressedPath);
        
        data = uncompressedResult.data;
        error = uncompressedResult.error;
    }

    if (error || !data) {
        console.error('Snapshot download error:', error);
        return NextResponse.json({ 
            error: 'Snapshot not found', 
            details: error?.message || 'File not found',
            paths: { compressed: compressedPath, uncompressed: uncompressedPath }
        }, { status: 404 });
    }

    console.log('✅ Downloaded successfully, size:', data.size, 'compressed:', isCompressed);

    try {
        let jsonText: string;
        
        if (isCompressed) {
            // Decompress gzip data
            const arrayBuffer = await data.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const decompressed = await gunzipAsync(buffer);
            jsonText = decompressed.toString('utf-8');
            console.log('📦 Decompressed:', buffer.length, '→', jsonText.length, 'bytes');
        } else {
            jsonText = await data.text();
        }
        
        const json = JSON.parse(jsonText);
        console.log('JSON parsed successfully, keys:', Object.keys(json));

        return encryptedJsonResponse(json, { 
            status: 200, 
            headers: { 
                'Cache-Control': 'public, max-age=300, s-maxage=3600', // CDN cache for 1 hour
                'X-Compressed': isCompressed ? 'true' : 'false'
            }
        });
    } catch (parseError) {
        console.error('Failed to parse snapshot data:', parseError);
        return NextResponse.json({ 
            error: 'Failed to parse snapshot data',
            details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }, { status: 500 });
    }
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
 * Now requires authentication for security
 */
export async function GET(req: NextRequest) {
    console.warn('⚠️ GET request to /api/get-snapshot is deprecated. Use POST for security.');
    
    try {
        console.log('=== Get Snapshot API Called (GET - Deprecated) ===');
        
        // 🔒 Security: Require authentication for GET as well
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }
        
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId') || '';
        const pagePath = searchParams.get('pagePath') || '';
        const deviceType = searchParams.get('deviceType') || '';

        // 🔒 Security: Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

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
