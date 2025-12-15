/**
 * Goal Validation Utilities
 * 
 * Secure validation and sanitization for experiment goals.
 * Prevents XSS, injection attacks, and invalid configurations.
 */

import type { ExperimentGoal, GoalType, UrlMatchType } from './types';

// Valid goal types
const VALID_GOAL_TYPES: GoalType[] = [
    'click', 'pageview', 'form_submit', 'custom_event',
    'scroll_depth', 'time_on_page', 'revenue'
];

const VALID_URL_MATCH_TYPES: UrlMatchType[] = ['exact', 'contains', 'regex'];

// Security: Disallowed patterns in CSS selectors (prevent XSS)
const DANGEROUS_SELECTOR_PATTERNS = [
    /javascript:/i,
    /expression\(/i,
    /<script/i,
    /on\w+\s*=/i,  // onclick=, onload=, etc.
    /data:/i,
    /url\s*\(/i,
];

// Security: Max lengths to prevent DoS
const MAX_LENGTHS = {
    name: 100,
    selector: 500,
    url_pattern: 500,
    event_name: 100,
    value_field: 50,
    currency: 3,
};

/**
 * Validate a CSS selector for security and syntax
 */
export function validateSelector(selector: string): { valid: boolean; error?: string } {
    if (!selector || typeof selector !== 'string') {
        return { valid: false, error: 'Selector is required' };
    }

    if (selector.length > MAX_LENGTHS.selector) {
        return { valid: false, error: `Selector exceeds ${MAX_LENGTHS.selector} characters` };
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_SELECTOR_PATTERNS) {
        if (pattern.test(selector)) {
            return { valid: false, error: 'Selector contains disallowed pattern' };
        }
    }

    // Basic CSS selector syntax validation
    try {
        // Use CSS.escape awareness - but don't actually run in Node
        // Just check for basic validity
        if (!/^[a-zA-Z#.\[\]="':\-_\s\d>+~*()^$|,]+$/.test(selector)) {
            return { valid: false, error: 'Selector contains invalid characters' };
        }
    } catch {
        return { valid: false, error: 'Invalid selector syntax' };
    }

    return { valid: true };
}

/**
 * Validate URL pattern for security
 */
export function validateUrlPattern(pattern: string, matchType: UrlMatchType): { valid: boolean; error?: string } {
    if (!pattern || typeof pattern !== 'string') {
        return { valid: false, error: 'URL pattern is required' };
    }

    if (pattern.length > MAX_LENGTHS.url_pattern) {
        return { valid: false, error: `URL pattern exceeds ${MAX_LENGTHS.url_pattern} characters` };
    }

    // Check for script injection
    if (/javascript:|data:|<script/i.test(pattern)) {
        return { valid: false, error: 'URL pattern contains disallowed protocol' };
    }

    // Validate regex patterns
    if (matchType === 'regex') {
        try {
            new RegExp(pattern);
        } catch {
            return { valid: false, error: 'Invalid regex pattern' };
        }
    }

    return { valid: true };
}

/**
 * Validate event name for custom events
 */
export function validateEventName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Event name is required' };
    }

    if (name.length > MAX_LENGTHS.event_name) {
        return { valid: false, error: `Event name exceeds ${MAX_LENGTHS.event_name} characters` };
    }

    // Only allow alphanumeric, underscore, hyphen
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
        return { valid: false, error: 'Event name must start with letter and contain only alphanumeric, underscore, hyphen' };
    }

    return { valid: true };
}

/**
 * Validate a complete goal configuration
 */
export function validateGoal(goal: Partial<ExperimentGoal>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!goal.name || goal.name.length > MAX_LENGTHS.name) {
        errors.push('Goal name is required and must be under 100 characters');
    }

    if (!goal.type || !VALID_GOAL_TYPES.includes(goal.type)) {
        errors.push(`Invalid goal type. Must be one of: ${VALID_GOAL_TYPES.join(', ')}`);
    }

    if (typeof goal.is_primary !== 'boolean') {
        errors.push('is_primary must be a boolean');
    }

    // Type-specific validation
    switch (goal.type) {
        case 'click':
        case 'form_submit':
            if (goal.selector) {
                const selectorResult = validateSelector(goal.selector);
                if (!selectorResult.valid) {
                    errors.push(selectorResult.error!);
                }
            }
            break;

        case 'pageview':
            if (!goal.url_pattern) {
                errors.push('URL pattern is required for pageview goals');
            } else {
                const urlMatch = goal.url_match || 'contains';
                if (!VALID_URL_MATCH_TYPES.includes(urlMatch)) {
                    errors.push(`Invalid url_match type. Must be one of: ${VALID_URL_MATCH_TYPES.join(', ')}`);
                }
                const urlResult = validateUrlPattern(goal.url_pattern, urlMatch);
                if (!urlResult.valid) {
                    errors.push(urlResult.error!);
                }
            }
            break;

        case 'custom_event':
            if (!goal.event_name) {
                errors.push('Event name is required for custom_event goals');
            } else {
                const eventResult = validateEventName(goal.event_name);
                if (!eventResult.valid) {
                    errors.push(eventResult.error!);
                }
            }
            break;

        case 'scroll_depth':
            if (typeof goal.depth_percentage !== 'number' ||
                goal.depth_percentage < 0 ||
                goal.depth_percentage > 100) {
                errors.push('Scroll depth must be a number between 0 and 100');
            }
            break;

        case 'time_on_page':
            if (typeof goal.seconds !== 'number' || goal.seconds < 1 || goal.seconds > 3600) {
                errors.push('Time on page must be between 1 and 3600 seconds');
            }
            break;

        case 'revenue':
            if (!goal.event_name) {
                errors.push('Event name is required for revenue goals');
            }
            if (goal.value_field && goal.value_field.length > MAX_LENGTHS.value_field) {
                errors.push(`Value field name exceeds ${MAX_LENGTHS.value_field} characters`);
            }
            if (goal.currency && (goal.currency.length !== 3 || !/^[A-Z]{3}$/.test(goal.currency))) {
                errors.push('Currency must be a 3-letter ISO code (e.g., USD, EUR)');
            }
            break;
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Sanitize and normalize a goal object
 */
export function sanitizeGoal(goal: Partial<ExperimentGoal>): ExperimentGoal {
    const sanitized: ExperimentGoal = {
        id: goal.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: String(goal.name || 'Untitled Goal').substring(0, MAX_LENGTHS.name),
        type: VALID_GOAL_TYPES.includes(goal.type as GoalType) ? goal.type as GoalType : 'custom_event',
        is_primary: Boolean(goal.is_primary),
    };

    // Add type-specific fields only
    switch (sanitized.type) {
        case 'click':
        case 'form_submit':
            if (goal.selector) {
                sanitized.selector = String(goal.selector).substring(0, MAX_LENGTHS.selector);
            }
            if (goal.url_pattern) {
                sanitized.url_pattern = String(goal.url_pattern).substring(0, MAX_LENGTHS.url_pattern);
            }
            break;

        case 'pageview':
            sanitized.url_pattern = String(goal.url_pattern || '/').substring(0, MAX_LENGTHS.url_pattern);
            sanitized.url_match = VALID_URL_MATCH_TYPES.includes(goal.url_match as UrlMatchType)
                ? goal.url_match as UrlMatchType
                : 'contains';
            break;

        case 'custom_event':
        case 'revenue':
            sanitized.event_name = String(goal.event_name || 'conversion').substring(0, MAX_LENGTHS.event_name);
            if (sanitized.type === 'revenue') {
                sanitized.track_value = Boolean(goal.track_value);
                if (goal.value_field) {
                    sanitized.value_field = String(goal.value_field).substring(0, MAX_LENGTHS.value_field);
                }
                if (goal.currency) {
                    sanitized.currency = String(goal.currency).toUpperCase().substring(0, 3);
                }
            }
            break;

        case 'scroll_depth':
            sanitized.depth_percentage = Math.min(100, Math.max(0, Number(goal.depth_percentage) || 50));
            break;

        case 'time_on_page':
            sanitized.seconds = Math.min(3600, Math.max(1, Number(goal.seconds) || 30));
            break;
    }

    return sanitized;
}

/**
 * Validate and sanitize an array of goals
 */
export function validateAndSanitizeGoals(goals: unknown[]): {
    goals: ExperimentGoal[];
    errors: string[];
    hasPrimary: boolean;
} {
    const errors: string[] = [];
    const sanitizedGoals: ExperimentGoal[] = [];
    let hasPrimary = false;

    if (!Array.isArray(goals)) {
        return { goals: [], errors: ['Goals must be an array'], hasPrimary: false };
    }

    if (goals.length > 10) {
        return { goals: [], errors: ['Maximum 10 goals per experiment'], hasPrimary: false };
    }

    for (let i = 0; i < goals.length; i++) {
        const goal = goals[i] as Partial<ExperimentGoal>;
        const validation = validateGoal(goal);

        if (!validation.valid) {
            errors.push(`Goal ${i + 1}: ${validation.errors.join(', ')}`);
        } else {
            const sanitized = sanitizeGoal(goal);
            sanitizedGoals.push(sanitized);
            if (sanitized.is_primary) hasPrimary = true;
        }
    }

    // Ensure at least one primary goal
    if (sanitizedGoals.length > 0 && !hasPrimary) {
        sanitizedGoals[0].is_primary = true;
        hasPrimary = true;
    }

    return { goals: sanitizedGoals, errors, hasPrimary };
}
