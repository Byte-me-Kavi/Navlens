/**
 * Experiment Cache
 * 
 * In-memory LRU cache for experiment configurations.
 * Eliminates database lookups for hot experiment data.
 * 
 * Uses the existing LRUCache from lib/cache.ts for consistency.
 */

import { LRUCache, generateCacheKey, withCache } from '../cache';
import type { Experiment, ExperimentResults } from './types';

// ============================================
// CACHE INSTANCES
// ============================================

/**
 * Active experiments cache (per site)
 * - High TTL (5 min) since experiment configs rarely change
 * - Invalidate on experiment create/update/delete
 */
export const activeExperimentsCache = new LRUCache<string, Experiment[]>(50, 300000);

/**
 * Single experiment cache
 * - Shorter TTL (2 min) for individual lookups
 */
export const experimentCache = new LRUCache<string, Experiment>(100, 120000);

/**
 * Experiment results cache
 * - Short TTL (30 sec) since results need to be relatively fresh
 * - Caches aggregated stats from ClickHouse
 */
export const resultsCache = new LRUCache<string, ExperimentResults>(30, 30000);

// ============================================
// CACHE KEY GENERATORS
// ============================================

export function getActiveExperimentsCacheKey(siteId: string): string {
    return generateCacheKey(siteId, 'active-experiments');
}

export function getExperimentCacheKey(siteId: string, experimentId: string): string {
    return generateCacheKey(siteId, 'experiment', { id: experimentId });
}

export function getResultsCacheKey(
    siteId: string,
    experimentId: string,
    startDate?: string,
    endDate?: string
): string {
    return generateCacheKey(siteId, 'results', {
        id: experimentId,
        start: startDate || 'all',
        end: endDate || 'now'
    });
}

// ============================================
// CACHE HELPERS
// ============================================

/**
 * Invalidate all experiment-related caches for a site
 * Call this when an experiment is created/updated/deleted
 */
export function invalidateExperimentCaches(siteId: string): void {
    activeExperimentsCache.invalidateBySite(siteId);
    experimentCache.invalidateBySite(siteId);
    resultsCache.invalidateBySite(siteId);
}

/**
 * Invalidate caches for a specific experiment
 */
export function invalidateExperiment(siteId: string, experimentId: string): void {
    activeExperimentsCache.invalidateBySite(siteId);
    experimentCache.delete(getExperimentCacheKey(siteId, experimentId));
    resultsCache.invalidate(new RegExp(`^${siteId}:results:id=${experimentId}`));
}

/**
 * Get cached active experiments or fetch from DB
 */
export async function getCachedActiveExperiments(
    siteId: string,
    fetcher: () => Promise<Experiment[]>
): Promise<Experiment[]> {
    return withCache(
        activeExperimentsCache,
        getActiveExperimentsCacheKey(siteId),
        fetcher
    );
}

/**
 * Get cached experiment results or compute
 */
export async function getCachedResults(
    siteId: string,
    experimentId: string,
    fetcher: () => Promise<ExperimentResults>,
    startDate?: string,
    endDate?: string
): Promise<ExperimentResults> {
    return withCache(
        resultsCache,
        getResultsCacheKey(siteId, experimentId, startDate, endDate),
        fetcher
    );
}

// ============================================
// CACHE STATS (for monitoring)
// ============================================

export function getExperimentCacheStats(): {
    activeExperiments: { size: number; maxSize: number; defaultTTL: number };
    experiments: { size: number; maxSize: number; defaultTTL: number };
    results: { size: number; maxSize: number; defaultTTL: number };
} {
    return {
        activeExperiments: activeExperimentsCache.stats(),
        experiments: experimentCache.stats(),
        results: resultsCache.stats(),
    };
}
