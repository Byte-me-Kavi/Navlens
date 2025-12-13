/**
 * Tracker CORS Utility
 * 
 * Validates request origins against registered domains in the sites table.
 * Only allows requests from domains registered for the specific site_id.
 * Always allows localhost for development.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cached site domain lookup (5 minutes)
export const getSiteDomain = unstable_cache(
    async (siteId: string): Promise<{ domain: string | null; valid: boolean }> => {
        const { data, error } = await supabase
            .from('sites')
            .select('domain')
            .eq('id', siteId)
            .single();

        if (error || !data) {
            return { domain: null, valid: false };
        }

        return { domain: data.domain, valid: true };
    },
    ['site-domain-lookup'],
    { revalidate: 300 } // 5 minutes
);

/**
 * Check if an origin is allowed for a site
 * @param origin - The request origin header
 * @param siteDomain - The site's registered domain
 * @returns boolean - true if origin is allowed
 */
export function isOriginAllowed(origin: string | null, siteDomain: string | null): boolean {
    // No origin header (server-side requests) - allow
    if (!origin) return true;

    // Always allow localhost for development
    try {
        const originHost = new URL(origin).hostname;
        if (originHost === 'localhost' || originHost === '127.0.0.1') {
            return true;
        }

        // If site has no domain configured, block all 
        if (!siteDomain) {
            console.warn(`[trackerCors] Site has no domain configured, allowing all origins`);
            return false;
        }

        // Normalize the registered domain (remove protocol and trailing slash)
        const normalizedDomain = siteDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        // Exact match or subdomain match
        if (originHost === normalizedDomain || originHost.endsWith('.' + normalizedDomain)) {
            return true;
        }

        console.warn(`[trackerCors] Origin ${origin} not allowed for domain ${normalizedDomain}`);
        return false;
    } catch (e) {
        console.error('[trackerCors] Error parsing origin:', e);
        return false;
    }
}

/**
 * Add CORS headers to response
 * Only sets Access-Control-Allow-Origin if the origin is allowed
 */
export function addTrackerCorsHeaders(
    response: NextResponse,
    origin: string | null,
    isAllowed: boolean
): NextResponse {
    if (isAllowed && origin) {
        // Set the specific origin (not wildcard) for proper CORS
        response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // No origin header (server-side request) - use wildcard
        response.headers.set('Access-Control-Allow-Origin', '*');
    }
    // If not allowed, don't set CORS headers - browser will block the request

    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, content-type, Content-Encoding, content-encoding, x-api-key');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}

/**
 * Create an OPTIONS response for preflight requests
 * For tracker APIs, we need to allow preflight from any origin to check the domain
 */
export function createPreflightResponse(origin: string | null): NextResponse {
    const response = new NextResponse(null, { status: 204 });

    // For preflight, we allow the origin temporarily
    // The actual POST request will validate the site_id + origin match
    if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, content-type, Content-Encoding, content-encoding, x-api-key');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}

/**
 * Validate site and origin together
 * Returns validation result with domain info
 */
export async function validateSiteAndOrigin(
    siteId: string,
    origin: string | null
): Promise<{
    valid: boolean;
    allowed: boolean;
    domain: string | null;
    error?: string;
}> {
    // Get site domain
    const siteInfo = await getSiteDomain(siteId);

    if (!siteInfo.valid) {
        return { valid: false, allowed: false, domain: null, error: 'Site not found' };
    }

    // Check if origin is allowed
    const allowed = isOriginAllowed(origin, siteInfo.domain);

    return {
        valid: true,
        allowed,
        domain: siteInfo.domain,
        error: allowed ? undefined : 'Origin not allowed for this site'
    };
}
