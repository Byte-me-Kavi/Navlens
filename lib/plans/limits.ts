/**
 * Centralized Plan Limit Fallbacks
 * 
 * This module provides consistent fallback values for plan limits when they
 * are not explicitly set in the database. All code that needs plan limits
 * should use this as the single source of truth for fallback logic.
 * 
 * PRIMARY SOURCE: Database `subscription_plans.limits` column
 * FALLBACK SOURCE: This file (based on plan name matching)
 */

import { PLANS, PlanTier, PlanLimit } from './config';

export interface PlanLimits {
    sessions: number;
    recordings: number;
    max_sites: number;
    heatmap_pages: number;
    active_experiments: number;
    active_surveys: number;
    retention_days: number;
}

/**
 * Default limits for the Free plan (used when no subscription exists)
 */
export const FREE_PLAN_DEFAULTS: PlanLimits = {
    sessions: PLANS.FREE.limits.sessions,
    recordings: PLANS.FREE.limits.recordings,
    max_sites: PLANS.FREE.limits.max_sites ?? 1,
    heatmap_pages: PLANS.FREE.limits.heatmap_pages ?? 3,
    active_experiments: PLANS.FREE.limits.active_experiments ?? 0,
    active_surveys: PLANS.FREE.limits.active_surveys ?? 0,
    retention_days: PLANS.FREE.limits.retention_days,
};

/**
 * Get fallback limits based on plan name
 * Use this ONLY when the database `limits` column is missing a specific field
 * 
 * @param planName - The plan name from the database (case-insensitive)
 * @returns Complete PlanLimits object with fallback values
 */
export function getPlanLimitsFallback(planName: string | null | undefined): PlanLimits {
    if (!planName) {
        return { ...FREE_PLAN_DEFAULTS };
    }

    const normalizedName = planName.toLowerCase().trim();

    // Try to match to a known plan tier
    let tier: PlanTier = 'FREE';
    if (normalizedName.includes('enterprise')) {
        tier = 'ENTERPRISE';
    } else if (normalizedName.includes('pro')) {
        tier = 'PRO';
    } else if (normalizedName.includes('starter')) {
        tier = 'STARTER';
    }

    const planConfig = PLANS[tier];

    return {
        sessions: planConfig.limits.sessions,
        recordings: planConfig.limits.recordings,
        max_sites: planConfig.limits.max_sites ?? (tier === 'ENTERPRISE' ? -1 : tier === 'PRO' ? 5 : tier === 'STARTER' ? 3 : 1),
        heatmap_pages: planConfig.limits.heatmap_pages ?? (tier === 'ENTERPRISE' ? -1 : tier === 'PRO' ? 15 : tier === 'STARTER' ? 8 : 3),
        active_experiments: planConfig.limits.active_experiments ?? (tier === 'FREE' ? 0 : tier === 'STARTER' ? 1 : -1),
        active_surveys: planConfig.limits.active_surveys ?? (tier === 'FREE' ? 0 : tier === 'STARTER' ? 1 : -1),
        retention_days: planConfig.limits.retention_days,
    };
}

/**
 * Merge database limits with fallback values
 * 
 * Use this to ensure all limit fields are populated even if the database
 * only has partial data in the `limits` JSONB column.
 * 
 * @param dbLimits - The limits object from database (may be partial)
 * @param planName - The plan name for fallback resolution
 * @returns Complete PlanLimits object
 */
export function mergeLimitsWithFallback(
    dbLimits: Partial<PlanLimit> | null | undefined,
    planName: string | null | undefined
): PlanLimits {
    const fallback = getPlanLimitsFallback(planName);

    if (!dbLimits) {
        return fallback;
    }

    return {
        sessions: dbLimits.sessions ?? fallback.sessions,
        recordings: dbLimits.recordings ?? fallback.recordings,
        max_sites: dbLimits.max_sites ?? fallback.max_sites,
        heatmap_pages: dbLimits.heatmap_pages ?? fallback.heatmap_pages,
        active_experiments: dbLimits.active_experiments ?? fallback.active_experiments,
        active_surveys: dbLimits.active_surveys ?? fallback.active_surveys,
        retention_days: dbLimits.retention_days ?? fallback.retention_days,
    };
}

/**
 * Check if a limit value means "unlimited"
 * Convention: -1 means unlimited
 */
export function isUnlimited(limit: number): boolean {
    return limit === -1;
}
