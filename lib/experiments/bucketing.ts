/**
 * Deterministic Bucketing for A/B Testing
 * 
 * CRITICAL: Never use Math.random() for experiment assignment.
 * This module uses SHA-256 hashing to ensure:
 * - Same visitor + same experiment = always same variant
 * - No database lookup required
 * - Works at edge (middleware) for zero latency
 * 
 * Performance: ~0.01ms per assignment
 */

import { createHash } from 'crypto';
import type { Variant, Experiment } from './types';

/**
 * Get bucket index using deterministic hashing
 * @param visitorId - Unique visitor identifier
 * @param experimentId - Experiment ID
 * @param totalVariants - Number of variants (default: 2)
 * @returns Bucket index (0 to totalVariants-1)
 */
export function getBucket(
    visitorId: string,
    experimentId: string,
    totalVariants: number = 2
): number {
    // Create unique key combining visitor and experiment
    const key = `${visitorId}-${experimentId}`;

    // SHA-256 hash for uniform distribution
    const hash = createHash('sha256').update(key).digest('hex');

    // Use first 8 hex chars (32 bits) for bucket calculation
    // This gives us 4 billion+ possible values for even distribution
    const hashInt = parseInt(hash.substring(0, 8), 16);

    return hashInt % totalVariants;
}

/**
 * Get variant ID based on bucket and variant weights
 * Supports unequal traffic splits (e.g., 90% control, 10% variant)
 * @param visitorId - Unique visitor identifier
 * @param experiment - Full experiment config with variants
 * @returns Variant object or null if visitor excluded from experiment
 */
export function assignVariant(
    visitorId: string,
    experiment: Experiment
): Variant | null {
    // Check if visitor is included in experiment traffic
    if (experiment.traffic_percentage < 100) {
        const trafficBucket = getBucket(visitorId, `${experiment.id}_traffic`, 100);
        if (trafficBucket >= experiment.traffic_percentage) {
            return null; // Visitor excluded from experiment
        }
    }

    const variants = experiment.variants;
    if (!variants || variants.length === 0) {
        return null;
    }

    // Fast path: equal weights (most common)
    const hasEqualWeights = variants.every(v => v.weight === variants[0].weight);
    if (hasEqualWeights) {
        const bucket = getBucket(visitorId, experiment.id, variants.length);
        return variants[bucket];
    }

    // Weighted assignment: use hash to pick based on cumulative weights
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const bucket = getBucket(visitorId, experiment.id, totalWeight);

    let cumulative = 0;
    for (const variant of variants) {
        cumulative += variant.weight;
        if (bucket < cumulative) {
            return variant;
        }
    }

    // Fallback to last variant (shouldn't reach here)
    return variants[variants.length - 1];
}

/**
 * Assign multiple experiments at once (for middleware efficiency)
 * @param visitorId - Unique visitor identifier
 * @param experiments - Array of active experiments
 * @returns Map of experiment_id -> variant_id
 */
export function assignAllVariants(
    visitorId: string,
    experiments: Experiment[]
): Record<string, string> {
    const assignments: Record<string, string> = {};

    for (const experiment of experiments) {
        if (experiment.status !== 'running') continue;

        const variant = assignVariant(visitorId, experiment);
        if (variant) {
            assignments[experiment.id] = variant.id;
        }
    }

    return assignments;
}

/**
 * Verify assignment consistency (for debugging/testing)
 * Runs 100 iterations to confirm deterministic behavior
 */
export function verifyConsistency(
    visitorId: string,
    experimentId: string,
    totalVariants: number = 2
): { consistent: boolean; bucket: number } {
    const firstBucket = getBucket(visitorId, experimentId, totalVariants);

    for (let i = 0; i < 100; i++) {
        const bucket = getBucket(visitorId, experimentId, totalVariants);
        if (bucket !== firstBucket) {
            return { consistent: false, bucket: firstBucket };
        }
    }

    return { consistent: true, bucket: firstBucket };
}
