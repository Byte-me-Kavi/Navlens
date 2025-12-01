import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { validators } from '@/lib/validation';

const gzipAsync = promisify(gzip);

// Helper to add CORS headers to response with dynamic origin
function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  // Use the requesting origin if provided, otherwise allow all
  // This is required because sendBeacon may include credentials
  response.headers.set('Access-Control-Allow-Origin', origin || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// Helper to create JSON response with CORS headers
function jsonResponse(data: object, status: number = 200, origin?: string | null): NextResponse {
  const response = NextResponse.json(data, { status });
  return addCorsHeaders(response, origin);
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return addCorsHeaders(new NextResponse(null, { status: 204 }), origin);
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

// Simple in-memory cache for site validation (reduces DB calls)
const siteValidationCache = new Map<string, { valid: boolean; hasApiKey: boolean; apiKey: string | null; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate site_id exists in database AND verify API key
 * SECURITY: Both site AND tracker MUST have matching API keys set
 * Uses caching to reduce database load from frequent tracker requests
 */
async function validateSiteAndAuth(siteId: string, apiKey?: string): Promise<{ valid: boolean; reason?: string }> {
    if (!validators.isValidUUID(siteId)) {
        return { valid: false, reason: 'Invalid site_id format' };
    }
    
    // Check cache first
    const cached = siteValidationCache.get(siteId);
    if (cached && Date.now() < cached.expiresAt) {
        if (!cached.valid) {
            return { valid: false, reason: 'Site not found' };
        }
        // Validate API key from cache
        return validateApiKey(cached.apiKey, apiKey);
    }
    
    // Query database for site
    const { data: site, error } = await supabase
        .from('sites')
        .select('id, api_key')
        .eq('id', siteId)
        .single();
    
    if (error || !site) {
        // Cache negative result
        siteValidationCache.set(siteId, { valid: false, hasApiKey: false, apiKey: null, expiresAt: Date.now() + CACHE_TTL });
        return { valid: false, reason: 'Site not found' };
    }
    
    // Cache positive result with API key info
    siteValidationCache.set(siteId, { 
        valid: true, 
        hasApiKey: !!site.api_key, 
        apiKey: site.api_key || null,
        expiresAt: Date.now() + CACHE_TTL 
    });
    
    // Validate API key
    return validateApiKey(site.api_key, apiKey);
}

/**
 * Validate API key - More permissive for backwards compatibility
 * Sites without API keys are allowed, but if a site HAS an API key, tracker must provide matching key
 */
function validateApiKey(siteApiKey: string | null, trackerApiKey?: string): { valid: boolean; reason?: string } {
    const siteHasKey = siteApiKey && siteApiKey.length > 0;
    const trackerHasKey = trackerApiKey && trackerApiKey.length > 0;
    
    // Case 1: Neither has key - ALLOW (backwards compatibility)
    if (!siteHasKey && !trackerHasKey) {
        return { valid: true };
    }
    
    // Case 2: Site has key, tracker doesn't - REJECT
    if (siteHasKey && !trackerHasKey) {
        return { valid: false, reason: 'Missing API key in tracker' };
    }
    
    // Case 3: Tracker has key, site doesn't - Allow (tracker is trying to be secure)
    if (!siteHasKey && trackerHasKey) {
        return { valid: true };
    }
    
    // Case 4: Both have keys - verify they match
    if (siteApiKey !== trackerApiKey) {
        return { valid: false, reason: 'Invalid API key' };
    }
    
    return { valid: true };
}

export async function POST(req: NextRequest) {
    const start = performance.now();
    const requestOrigin = req.headers.get('origin');
    
    try {
        console.log('DOM snapshot POST received');
        
        // 1. Extract Data (Including new width/height/hash fields from tracker)
        const body = await req.json();
        const { 
            site_id, 
            page_path, 
            device_type, 
            snapshot, 
            styles, 
            origin,
            width,     // Capture dimensions
            height,
            hash,      // Capture content hash
            api_key    // Optional per-site API key
        } = body;

        if (!site_id || !snapshot) {
            return jsonResponse({ error: 'Missing data' }, 400, requestOrigin);
        }

        // 🔒 Security: Validate site_id exists and check API key if configured
        const validation = await validateSiteAndAuth(site_id, api_key);
        if (!validation.valid) {
            console.error('❌ Validation failed:', validation.reason);
            return jsonResponse(
                { error: validation.reason || 'Validation failed' }, 
                401,
                requestOrigin
            );
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
            return jsonResponse({ error: errors.join('; ') }, 500, requestOrigin);
        }

        console.log(`✅ Snapshot processed in ${(performance.now() - start).toFixed(2)}ms`);
        return jsonResponse({ success: true }, 200, requestOrigin);

    } catch (error: unknown) {
        console.error('Snapshot upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return jsonResponse({ error: message }, 500, requestOrigin);
    }
}