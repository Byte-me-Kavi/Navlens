/**
 * Rate Limiting - Zero Dependencies
 * 
 * Provides in-memory rate limiting with sliding window algorithm.
 * Works well for Vercel serverless - functions stay warm and traffic distributes naturally.
 * 
 * For higher scale, you can optionally add Vercel KV later.
 */

// Configuration
const IP_RATE_LIMIT = 100; // requests per IP per minute
const SITE_RATE_LIMIT = 1000; // requests per site per minute
const WINDOW_MS = 60 * 1000; // 1 minute sliding window

// Sliding window rate limiter using token bucket with timestamps
interface RateLimitEntry {
  tokens: number[];  // Timestamps of requests in current window
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const windowStart = now - WINDOW_MS;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove timestamps outside the window
    entry.tokens = entry.tokens.filter(t => t > windowStart);
    // Remove empty entries
    if (entry.tokens.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Sliding window rate limit check
 * More accurate than fixed window - counts requests in the last 60 seconds
 */
function slidingWindowRateLimit(
  key: string, 
  limit: number
): { success: boolean; remaining: number; reset: number } {
  cleanup();
  
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    entry = { tokens: [] };
    rateLimitStore.set(key, entry);
  }
  
  // Remove expired timestamps (outside the sliding window)
  entry.tokens = entry.tokens.filter(t => t > windowStart);
  
  // Check if limit exceeded
  if (entry.tokens.length >= limit) {
    // Find when the oldest token expires
    const oldestToken = Math.min(...entry.tokens);
    const reset = oldestToken + WINDOW_MS;
    return { 
      success: false, 
      remaining: 0, 
      reset 
    };
  }
  
  // Add new request timestamp
  entry.tokens.push(now);
  
  return { 
    success: true, 
    remaining: limit - entry.tokens.length,
    reset: now + WINDOW_MS
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
  headers: Record<string, string>;
}

/**
 * Check IP-based rate limit
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  const result = slidingWindowRateLimit(`ip:${ip}`, IP_RATE_LIMIT);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: IP_RATE_LIMIT,
    headers: {
      'X-RateLimit-Limit': String(IP_RATE_LIMIT),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
    },
  };
}

/**
 * Check site-based rate limit
 */
export async function checkSiteRateLimit(siteId: string): Promise<RateLimitResult> {
  const result = slidingWindowRateLimit(`site:${siteId}`, SITE_RATE_LIMIT);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: SITE_RATE_LIMIT,
    headers: {
      'X-RateLimit-Limit': String(SITE_RATE_LIMIT),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.floor(result.reset / 1000)),
    },
  };
}

/**
 * Combined rate limit check (both IP and site)
 */
export async function checkRateLimits(
  ip: string,
  siteId: string
): Promise<{ allowed: boolean; reason?: string; headers: Record<string, string> }> {
  // Check IP rate limit first
  const ipResult = await checkIpRateLimit(ip);
  if (!ipResult.success) {
    return {
      allowed: false,
      reason: 'IP rate limit exceeded',
      headers: ipResult.headers,
    };
  }

  // Check site rate limit
  const siteResult = await checkSiteRateLimit(siteId);
  if (!siteResult.success) {
    return {
      allowed: false,
      reason: 'Site rate limit exceeded',
      headers: siteResult.headers,
    };
  }

  return {
    allowed: true,
    headers: {
      ...ipResult.headers,
      'X-RateLimit-Site-Remaining': String(siteResult.remaining),
    },
  };
}

/**
 * Check rate limiting backend type
 */
export function isRedisAvailable(): boolean {
  return false; // Using in-memory only - no external dependencies
}
