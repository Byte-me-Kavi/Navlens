/**
 * Statistical Analysis Engine for A/B Testing
 * 
 * Provides commercial-grade statistical calculations:
 * - Z-Score for comparing conversion rates
 * - Confidence levels (80%, 90%, 95%, 99%)
 * - Lift calculation (% improvement)
 * - Sample size estimation
 * - Power analysis
 * 
 * All calculations happen server-side after ClickHouse aggregation.
 */

import type { VariantStats, ExperimentResults } from './types';

// ============================================
// CORE STATISTICAL FUNCTIONS
// ============================================

/**
 * Calculate Z-Score for two proportions (A/B test significance)
 * 
 * Formula: Z = (p1 - p2) / sqrt(p * (1-p) * (1/n1 + 1/n2))
 * where p is the pooled proportion
 * 
 * @param control - Control variant stats
 * @param variant - Test variant stats
 * @returns Z-score (positive = variant better, negative = control better)
 */
export function calculateZScore(
    control: Pick<VariantStats, 'users' | 'conversions'>,
    variant: Pick<VariantStats, 'users' | 'conversions'>
): number {
    const n1 = control.users;
    const n2 = variant.users;

    // Need minimum sample size for valid calculation
    if (n1 < 10 || n2 < 10) return 0;

    const p1 = control.conversions / n1; // Control conversion rate
    const p2 = variant.conversions / n2; // Variant conversion rate

    // Pooled sample proportion
    const p = (control.conversions + variant.conversions) / (n1 + n2);

    // Avoid division by zero
    if (p === 0 || p === 1) return 0;

    // Standard Error
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

    if (se === 0) return 0;

    // Z-score (positive means variant is better)
    return (p2 - p1) / se;
}

/**
 * Convert Z-score to confidence level percentage
 * 
 * Standard thresholds:
 * - Z >= 2.576 → 99% confidence
 * - Z >= 1.960 → 95% confidence (industry standard)
 * - Z >= 1.645 → 90% confidence
 * - Z >= 1.282 → 80% confidence
 */
export function getConfidenceLevel(zScore: number): number {
    const absZ = Math.abs(zScore);

    if (absZ >= 2.576) return 99;
    if (absZ >= 1.960) return 95;
    if (absZ >= 1.645) return 90;
    if (absZ >= 1.282) return 80;

    // Approximate for lower confidence
    // Using linear interpolation for smoother values
    if (absZ >= 0.674) return Math.round(50 + (absZ - 0.674) * 49.2);

    return Math.round(50 + absZ * 37);
}

/**
 * Calculate lift (relative improvement) percentage
 * 
 * @returns Positive = variant is better, Negative = control is better
 */
export function calculateLift(
    control: Pick<VariantStats, 'users' | 'conversions'>,
    variant: Pick<VariantStats, 'users' | 'conversions'>
): number {
    const controlRate = control.conversions / control.users;
    const variantRate = variant.conversions / variant.users;

    if (controlRate === 0) {
        // Can't calculate lift from 0 baseline
        return variantRate > 0 ? 100 : 0;
    }

    return ((variantRate - controlRate) / controlRate) * 100;
}

/**
 * Check if result is statistically significant
 * Industry standard: 95% confidence (Z >= 1.96)
 */
export function isSignificant(zScore: number, threshold: number = 1.96): boolean {
    return Math.abs(zScore) >= threshold;
}

// ============================================
// SAMPLE SIZE CALCULATIONS
// ============================================

/**
 * Estimate minimum sample size per variant
 * 
 * Based on: n = 2 * (Zα + Zβ)² * p(1-p) / (p1-p2)²
 * 
 * @param baselineRate - Expected control conversion rate (0-1)
 * @param minimumDetectableEffect - Minimum lift to detect (0-1, e.g., 0.05 = 5%)
 * @param confidenceLevel - 80, 90, 95, or 99
 * @param power - Statistical power (default 0.8)
 */
export function calculateMinimumSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    confidenceLevel: number = 95,
    power: number = 0.8
): number {
    // Z-values for common confidence levels
    const zAlpha: Record<number, number> = {
        80: 1.282,
        90: 1.645,
        95: 1.960,
        99: 2.576
    };

    // Z-value for power (0.8 power = Z of 0.84)
    const zBeta: Record<number, number> = {
        0.7: 0.524,
        0.8: 0.842,
        0.9: 1.282
    };

    const za = zAlpha[confidenceLevel] || 1.96;
    const zb = zBeta[power] || 0.842;

    const p1 = baselineRate;
    const p2 = baselineRate * (1 + minimumDetectableEffect);
    const pAvg = (p1 + p2) / 2;

    const numerator = 2 * Math.pow(za + zb, 2) * pAvg * (1 - pAvg);
    const denominator = Math.pow(p2 - p1, 2);

    if (denominator === 0) return Infinity;

    return Math.ceil(numerator / denominator);
}

/**
 * Estimate days needed to reach statistical significance
 */
export function estimateDaysToSignificance(
    dailyVisitors: number,
    baselineRate: number,
    minimumDetectableEffect: number,
    numVariants: number = 2,
    confidenceLevel: number = 95
): number {
    const samplePerVariant = calculateMinimumSampleSize(
        baselineRate,
        minimumDetectableEffect,
        confidenceLevel
    );

    const totalSampleNeeded = samplePerVariant * numVariants;
    return Math.ceil(totalSampleNeeded / dailyVisitors);
}

// ============================================
// ANALYSIS HELPERS
// ============================================

/**
 * Analyze complete experiment results
 * Returns winner, significance, and recommendations
 */
export function analyzeExperiment(
    variants: VariantStats[]
): Pick<ExperimentResults, 'winner' | 'confidence_level' | 'z_score' | 'lift_percentage' | 'is_significant'> {
    if (variants.length < 2) {
        return {
            is_significant: false
        };
    }

    // Find control (usually first variant or named 'control')
    const control = variants.find(v =>
        v.variant_name === 'control' ||
        v.variant_id === 'control'
    ) || variants[0];

    // Find best performing non-control variant
    let bestVariant = control;
    let bestZScore = 0;
    let bestLift = 0;

    for (const variant of variants) {
        if (variant.variant_id === control.variant_id) continue;

        const zScore = calculateZScore(control, variant);
        const lift = calculateLift(control, variant);

        // Track the variant with highest absolute Z-score
        if (Math.abs(zScore) > Math.abs(bestZScore)) {
            bestZScore = zScore;
            bestLift = lift;
            bestVariant = variant;
        }
    }

    const confidence = getConfidenceLevel(bestZScore);
    const significant = isSignificant(bestZScore);

    return {
        winner: significant ? (bestZScore > 0 ? bestVariant.variant_id : control.variant_id) : undefined,
        confidence_level: confidence,
        z_score: Math.round(bestZScore * 1000) / 1000, // Round to 3 decimals
        lift_percentage: Math.round(bestLift * 10) / 10, // Round to 1 decimal
        is_significant: significant
    };
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(
    confidence: number,
    isSignificant: boolean,
    winner?: string,
    sampleSize?: number
): string {
    if (!sampleSize || sampleSize < 100) {
        return 'Collecting data... Need at least 100 visitors per variant.';
    }

    if (!isSignificant) {
        if (confidence >= 80) {
            return `Trending towards significance (${confidence}% confidence). Continue test.`;
        }
        return 'No significant difference detected yet. Continue running the test.';
    }

    if (winner) {
        return `Winner found! ${winner} with ${confidence}% confidence.`;
    }

    return `Statistically significant result at ${confidence}% confidence.`;
}
