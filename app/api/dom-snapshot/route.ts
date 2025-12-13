import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { validators } from '@/lib/validation';
import { parseRequestBody } from '@/lib/decompress';
import { validateSiteAndOrigin, addTrackerCorsHeaders, createPreflightResponse } from '@/lib/trackerCors';

const gzipAsync = promisify(gzip);

// Helper to create JSON response with CORS headers
function jsonResponse(data: object, status: number = 200, origin: string | null = null, isAllowed: boolean = true): NextResponse {
    const response = NextResponse.json(data, { status });
    return addTrackerCorsHeaders(response, origin, isAllowed);
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin');
    return createPreflightResponse(origin);
}

// Initialize Admin Client (Service Role is required to bypass RLS for uploads)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Optional: Config to allow large snapshot payloads (Next.js specific)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Snapshots can be large
        },
    },
};

export async function POST(req: NextRequest) {
    const start = performance.now();
    const requestOrigin = req.headers.get('origin');

    try {
        console.log('DOM snapshot POST received');

        // 1. Extract Data (Including new width/height/hash fields from tracker)
        // NOTE: api_key is no longer sent from client for security
        // Handles both gzip compressed and regular JSON payloads
        interface SnapshotBody {
            site_id: string;
            page_path: string;
            device_type: string;
            snapshot: unknown;
            styles?: unknown[];
            origin?: string;
            width?: number;
            height?: number;
            hash?: string;
        }
        const body = await parseRequestBody<SnapshotBody>(req);
        const {
            site_id,
            page_path,
            device_type,
            snapshot,
            styles,
            origin,
            width,     // Capture dimensions
            height,
            hash       // Capture content hash
        } = body;

        if (!site_id || !snapshot) {
            return jsonResponse({ error: 'Missing data' }, 400, requestOrigin, true);
        }

        // 🔒 Security: Validate site_id AND origin
        const validation = await validateSiteAndOrigin(site_id, requestOrigin);
        if (!validation.valid) {
            console.error('❌ Validation failed: Site not found');
            return jsonResponse(
                { error: 'Site not found' },
                401,
                requestOrigin,
                false
            );
        }

        if (!validation.allowed) {
            console.error(`❌ Origin ${requestOrigin} not allowed for site ${site_id}`);
            // Return without CORS headers - browser will block
            return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
        }

        // 2. Normalize Path for Filename (Safe for Storage)
        // URL: /blog/post-1  ->  File: blog_post-1
        const normalizedPath = page_path === '/'
            ? 'homepage'
            : page_path.replace(/^\//, '').replace(/\//g, '_');

        // Use .json.gz extension for compressed files
        const fileName = `${normalizedPath}.json.gz`;
        const storagePath = `${site_id}/${device_type}/${fileName}`;

        console.log('Processing snapshot:', storagePath);

        // 3. Prepare File Content and COMPRESS with gzip
        const fileContent = {
            snapshot,
            styles: styles || [],
            origin: origin || '',
            meta: { width, height, device_type }
        };

        const jsonString = JSON.stringify(fileContent);
        const compressedData = await gzipAsync(Buffer.from(jsonString, 'utf-8'));

        // Log compression stats
        const originalSize = Buffer.byteLength(jsonString, 'utf-8');
        const compressedSize = compressedData.length;
        console.log(`📦 Compression: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${Math.round((1 - compressedSize / originalSize) * 100)}% reduction)`);

        // 4. PARALLEL EXECUTION (The Optimization)
        const results = await Promise.allSettled([
            // Task A: Upload COMPRESSED file to Storage Bucket
            supabase.storage
                .from('snapshots')
                .upload(storagePath, compressedData, {
                    contentType: 'application/gzip',
                    upsert: true,
                    cacheControl: '3600' // CDN cache for 1 hour
                }),

            // Task B: Update Database Index (Critical for Dashboard)
            supabase.from('snapshots').upsert({
                site_id: site_id,
                page_path: page_path,
                device_type: device_type,
                storage_path: storagePath,
                resolution_width: width || (device_type === 'mobile' ? 375 : 1440),
                resolution_height: height || (device_type === 'mobile' ? 667 : 900),
                content_hash: hash || null,
                is_compressed: true, // Track compression status
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'site_id, page_path, device_type'
            })
        ]);

        // Check for errors in results
        const errors: string[] = [];

        // Check storage upload result
        if (results[0].status === 'fulfilled') {
            const storageResult = results[0].value;
            if (storageResult.error) {
                console.error('Storage upload error:', storageResult.error);
                errors.push(`Storage: ${storageResult.error.message}`);
            }
        } else {
            console.error('Storage upload rejected:', results[0].reason);
            errors.push(`Storage rejected: ${results[0].reason}`);
        }

        // Check DB upsert result
        if (results[1].status === 'fulfilled') {
            const dbResult = results[1].value;
            if (dbResult.error) {
                console.error('DB upsert error:', dbResult.error);
                errors.push(`DB: ${dbResult.error.message}`);
            }
        } else {
            console.error('DB upsert rejected:', results[1].reason);
            errors.push(`DB rejected: ${results[1].reason}`);
        }

        if (errors.length > 0) {
            console.error('Snapshot operations failed:', errors);
            return jsonResponse({ error: errors.join('; ') }, 500, requestOrigin, true);
        }

        console.log(`✅ Snapshot processed in ${(performance.now() - start).toFixed(2)}ms`);
        return jsonResponse({ success: true }, 200, requestOrigin, true);

    } catch (error: unknown) {
        console.error('Snapshot upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ error: message }, 500, requestOrigin, true);
    }
}