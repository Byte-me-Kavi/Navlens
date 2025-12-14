/**
 * Rate Limiting Middleware
 * 
 * In-memory rate limiter for API endpoints.
 * Uses sliding window algorithm.
 * 
 * SECURITY: Prevents abuse of ingest and public endpoints.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory store (per-server instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

interface RateLimitConfig {
    windowMs: number;     // Time window in milliseconds
    maxRequests: number;  // Max requests per window
}

// Default limits for different endpoint types
export const RATE_LIMITS = {
    ingest: { windowMs: 60 * 1000, maxRequests: 100 },      // 100 req/min per IP
    api: { windowMs: 60 * 1000, maxRequests: 60 },          // 60 req/min per IP
    auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },    // 10 req/15min per IP
} as const;

/**
 * Check if request is rate limited
 */
export function isRateLimited(
    identifier: string,
    config: RateLimitConfig = RATE_LIMITS.api
): { limited: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const key = identifier;

    let entry = rateLimitStore.get(key);

    // Create new entry or reset if window expired
    if (!entry || entry.resetAt < now) {
        entry = {
            count: 1,
            resetAt: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
        return {
            limited: false,
            remaining: config.maxRequests - 1,
            resetAt: entry.resetAt,
        };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    const limited = entry.count > config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
        limited,
        remaining,
        resetAt: entry.resetAt,
    };
}

/**
 * Get IP address from request headers
 */
export function getClientIP(request: Request): string {
    // Check common headers for real IP (behind proxies)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback - use a hash of user agent as identifier
    const ua = request.headers.get('user-agent') || 'unknown';
    return `ua-${hashString(ua)}`;
}

/**
 * Simple string hash for fallback identification
 */
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(
    remaining: number,
    resetAt: number
): Record<string, string> {
    return {
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
    };
}
