/**
 * CORS Security Utilities
 * 
 * Provides secure CORS headers for API routes.
 * 
 * SECURITY:
 * - Dashboard routes: Returns specific origin (not wildcard)
 * - Public/tracker routes: Can use wildcard but still validates site ownership
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cache for allowed origins per site (5 min TTL)
const originCache = new Map<string, { origins: string[]; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get secure CORS headers for dashboard routes
 * Returns specific origin instead of wildcard
 */
export function secureCorsHeaders(origin: string | null): Record<string, string> {
    // List of allowed dashboard origins
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean) as string[];

    // Check if origin is allowed
    const isAllowed = origin && allowedOrigins.some(allowed =>
        origin === allowed || origin.startsWith(allowed)
    );

    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

/**
 * Get CORS headers for public tracker endpoints
 * These need to accept cross-origin requests from customer sites
 */
export function trackerCorsHeaders(origin: string | null): Record<string, string> {
    // Tracker endpoints accept any origin but validate site ownership separately
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

/**
 * Validate that origin is allowed for a specific site
 * Uses the site's registered domain
 */
export async function validateOriginForSite(
    origin: string | null,
    siteId: string
): Promise<boolean> {
    if (!origin) return true; // Allow if no origin (server-to-server)

    // Check cache
    const cached = originCache.get(siteId);
    if (cached && cached.expires > Date.now()) {
        return cached.origins.some(allowed => origin.includes(allowed));
    }

    try {
        // Fetch site's allowed domains
        const { data: site } = await supabaseAdmin
            .from('sites')
            .select('domain, allowed_origins')
            .eq('id', siteId)
            .single();

        if (!site) return false;

        // Build allowed origins list
        const allowedOrigins: string[] = [];

        if (site.domain) {
            allowedOrigins.push(site.domain);
            allowedOrigins.push(`https://${site.domain}`);
            allowedOrigins.push(`http://${site.domain}`);
        }

        if (site.allowed_origins && Array.isArray(site.allowed_origins)) {
            allowedOrigins.push(...site.allowed_origins);
        }

        // Add localhost for development
        allowedOrigins.push('http://localhost');

        // Cache result
        originCache.set(siteId, {
            origins: allowedOrigins,
            expires: Date.now() + CACHE_TTL,
        });

        // Check if origin matches any allowed
        return allowedOrigins.some(allowed => origin.includes(allowed));
    } catch {
        return false;
    }
}
