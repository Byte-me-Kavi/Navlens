/**
 * Navlens Experimentation Engine
 * 
 * Commercial-grade A/B testing with:
 * - Deterministic bucketing (SHA-256)
 * - In-memory caching (no Redis)
 * - Statistical significance analysis
 * 
 * @example
 * import { getBucket, assignVariant, calculateZScore } from '@/lib/experiments';
 */

// Core bucketing
export {
    getBucket,
    assignVariant,
    assignAllVariants,
    verifyConsistency
} from './bucketing';

// Type definitions
export type {
    Experiment,
    Variant,
    ExperimentStatus,
    ExperimentAssignment,
    ExperimentAssignments,
    VariantStats,
    ExperimentResults,
    CreateExperimentRequest,
    UpdateExperimentRequest
} from './types';

// Caching
export {
    activeExperimentsCache,
    experimentCache,
    resultsCache,
    invalidateExperimentCaches,
    invalidateExperiment,
    getCachedActiveExperiments,
    getCachedResults,
    getExperimentCacheStats
} from './cache';

// Statistical analysis
export {
    calculateZScore,
    getConfidenceLevel,
    calculateLift,
    isSignificant,
    calculateMinimumSampleSize,
    estimateDaysToSignificance,
    analyzeExperiment,
    getStatusMessage
} from './stats';
