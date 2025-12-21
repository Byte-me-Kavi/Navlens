/**
 * In-Memory LRU Cache
 * 
 * A simple, efficient LRU (Least Recently Used) cache implementation
 * for caching API responses without external dependencies like Redis.
 * 
 * Features:
 * - Configurable max size and TTL
 * - Automatic expiration of stale entries
 * - Pattern-based invalidation
 * - Thread-safe for Node.js single-threaded event loop
 * 
 * PERFORMANCE: Reduces database queries by caching frequently accessed data
 */

interface CacheEntry<V> {
    value: V;
    expiry: number;
    createdAt: number;
}

export class LRUCache<K extends string, V> {
    private cache: Map<K, CacheEntry<V>>;
    private maxSize: number;
    private defaultTTL: number;

    /**
     * Create a new LRU cache
     * @param maxSize - Maximum number of entries (default: 100)
     * @param defaultTTL - Default time-to-live in milliseconds (default: 60000 = 1 minute)
     */
    constructor(maxSize = 100, defaultTTL = 60000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }

    /**
     * Get a value from cache
     * Returns undefined if key doesn't exist or has expired
     */
    get(key: K): V | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        // Check if expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used) by re-inserting
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * Set a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Optional TTL in milliseconds (overrides default)
     */
    set(key: K, value: V, ttl?: number): void {
        // If cache is at max size, remove oldest entry (first in Map)
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        const expiry = Date.now() + (ttl ?? this.defaultTTL);
        this.cache.set(key, {
            value,
            expiry,
            createdAt: Date.now(),
        });
    }

    /**
     * Check if a key exists and is not expired
     */
    has(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Delete a specific key
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Invalidate all entries matching a pattern
     * @param pattern - RegExp pattern to match keys against
     * @returns Number of entries invalidated
     */
    invalidate(pattern: RegExp): number {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Invalidate all entries for a specific site
     * @param siteId - Site ID to invalidate cache for
     */
    invalidateBySite(siteId: string): number {
        return this.invalidate(new RegExp(`^${siteId}:`));
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get current cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    stats(): { size: number; maxSize: number; defaultTTL: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            defaultTTL: this.defaultTTL,
        };
    }

    /**
     * Clean up expired entries (call periodically to free memory)
     * @returns Number of entries cleaned
     */
    cleanup(): number {
        let count = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
}

// ============================================
// SINGLETON CACHE INSTANCES
// Use these for different cache domains
// ============================================

// API response cache - 30 second TTL, 200 entries
export const apiCache = new LRUCache<string, unknown>(200, 30000);

// Query result cache - 60 second TTL, 50 entries
export const queryCache = new LRUCache<string, unknown>(50, 60000);

// Performance data cache - 5 minute TTL, 100 entries
export const performanceCache = new LRUCache<string, unknown>(100, 300000);

// Journey/path analysis cache - 5 minute TTL, 30 entries
export const journeyCache = new LRUCache<string, unknown>(30, 300000);

// ============================================
// TIERED CACHING FOR DIFFERENT DATA TYPES
// (Commercial-grade optimization)
// ============================================

// Dashboard stats cache - 5 minute TTL (aggregated data changes slowly)
export const dashboardCache = new LRUCache<string, unknown>(50, 300000);

// Heatmap data cache - 10 minute TTL (coordinate data changes slowly)
export const heatmapCache = new LRUCache<string, unknown>(30, 600000);

// Real-time data cache - 15 second TTL (for live session counts)
export const realtimeCache = new LRUCache<string, unknown>(100, 15000);

// Subscription usage cache - 1 hour TTL (billing data doesn't need to be real-time)
export const subscriptionCache = new LRUCache<string, unknown>(20, 3600000);

/**
 * Generate a cache key from parameters
 * @param siteId - Site ID
 * @param endpoint - API endpoint name
 * @param params - Additional parameters
 */
export function generateCacheKey(
    siteId: string,
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
): string {
    let key = `${siteId}:${endpoint}`;
    if (params) {
        const sortedParams = Object.keys(params)
            .filter(k => params[k] !== undefined)
            .sort()
            .map(k => `${k}=${params[k]}`)
            .join('&');
        if (sortedParams) {
            key += `:${sortedParams}`;
        }
    }
    return key;
}

/**
 * Wrapper for cached API calls
 * @param cache - Cache instance to use
 * @param key - Cache key
 * @param fetcher - Async function to fetch data if not cached
 * @param ttl - Optional TTL override
 */
export async function withCache<T>(
    cache: LRUCache<string, unknown>,
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
): Promise<T> {
    // Check cache first
    const cached = cache.get(key);
    if (cached !== undefined) {
        return cached as T;
    }

    // Fetch and cache
    const result = await fetcher();
    cache.set(key, result, ttl);
    return result;
}

// Periodic cleanup - run every 5 minutes
if (typeof global !== 'undefined') {
    setInterval(() => {
        apiCache.cleanup();
        queryCache.cleanup();
        performanceCache.cleanup();
        journeyCache.cleanup();
        // Tiered caches
        dashboardCache.cleanup();
        heatmapCache.cleanup();
        realtimeCache.cleanup();
        subscriptionCache.cleanup();
    }, 5 * 60 * 1000);
}
