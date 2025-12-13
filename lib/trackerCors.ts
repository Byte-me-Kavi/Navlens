/**
 * Tracker CORS Utility
 * 
 * Validates request origins against registered domains in the sites table.
 * Only allows requests from domains registered for the specific site_id.
 * Always allows localhost for development.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Direct site domain lookup (no caching to avoid stale data issues)
export async function getSiteDomain(siteId: string): Promise<{ domain: string | null; valid: boolean }> {
    const { data, error } = await supabase
        .from('sites')
        .select('domain')
        .eq('id', siteId)
        .single();

    console.log(`[trackerCors] getSiteDomain for ${siteId}:`, { data, error: error?.message });

    if (error || !data) {
        return { domain: null, valid: false };
    }

    return { domain: data.domain, valid: true };
}

/**
 * Check if an origin is allowed for a site
 * @param origin - The request origin header
 * @param siteDomain - The site's registered domain
 * @returns boolean - true if origin is allowed
 */
export function isOriginAllowed(origin: string | null, siteDomain: string | null): boolean {
    console.log(`[trackerCors] isOriginAllowed - origin: ${origin}, siteDomain: ${siteDomain}`);

    // No origin header (server-side requests) - allow
    if (!origin) {
        console.log('[trackerCors] No origin header, allowing');
        return true;
    }

    // Always allow localhost for development
    try {
        const originHost = new URL(origin).hostname;
        console.log(`[trackerCors] originHost: ${originHost}`);

        if (originHost === 'localhost' || originHost === '127.0.0.1') {
            console.log('[trackerCors] Localhost origin, allowing');
            return true;
        }

        // If site has no domain configured, block all 
        if (!siteDomain) {
            console.warn(`[trackerCors] Site has no domain configured, blocking`);
            return false;
        }

        // Normalize the registered domain (remove protocol and trailing slash)
        const normalizedDomain = siteDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        console.log(`[trackerCors] normalizedDomain: ${normalizedDomain}`);

        // Exact match or subdomain match
        const isExactMatch = originHost === normalizedDomain;
        const isSubdomain = originHost.endsWith('.' + normalizedDomain);
        console.log(`[trackerCors] isExactMatch: ${isExactMatch}, isSubdomain: ${isSubdomain}`);

        if (isExactMatch || isSubdomain) {
            console.log('[trackerCors] Origin allowed');
            return true;
        }

        console.warn(`[trackerCors] Origin ${origin} not allowed for domain ${normalizedDomain}`);
        return false;
    } catch (e) {
        console.error('[trackerCors] Error parsing origin:', e);
        return false;
    }
}

export function addTrackerCorsHeaders(
    response: NextResponse,
    origin: string | null,
    isAllowed: boolean
): NextResponse {
    if (isAllowed && origin) {
        // Set the specific origin (not wildcard) for proper CORS with credentials
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else if (!origin) {
        // No origin header (server-side request) - use wildcard
        response.headers.set('Access-Control-Allow-Origin', '*');
        // Don't set credentials with wildcard
    }
    // If not allowed, don't set CORS headers - browser will block the request

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, content-type, Content-Encoding, content-encoding, x-api-key');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}

export function createPreflightResponse(origin: string | null): NextResponse {
    const response = new NextResponse(null, { status: 204 });

    // For preflight, we allow the origin temporarily
    // The actual POST request will validate the site_id + origin match
    if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
