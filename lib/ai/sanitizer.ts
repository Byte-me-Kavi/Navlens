/**
 * AI Data Sanitizer
 * 
 * Utilities for preparing data for AI analysis:
 * - Event summarization to reduce tokens
 * - PII redaction
 * - Data aggregation
 */

// Pattern for detecting PII
const PII_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+?[0-9]{1,3}[-.\s]?)?(\([0-9]{2,4}\)|[0-9]{2,4})[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/g,
    ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    creditCard: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Redact PII from text
 */
export function redactPII(text: string): string {
    let sanitized = text;
    sanitized = sanitized.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]');
    sanitized = sanitized.replace(PII_PATTERNS.ip, '[IP_REDACTED]');
    return sanitized;
}

/**
 * Summarize rrweb events for AI consumption
 * Reduces token count while preserving important information
 */
export interface RRWebEventSummary {
    totalEvents: number;
    duration: number;
    pageViews: string[];
    clicks: {
        count: number;
        elements: string[];
        rageClicks: number;
    };
    scrolls: {
        maxDepth: number;
        rapidScrolls: number;
    };
    inputs: {
        count: number;
        fields: string[];
    };
    errors: string[];
    frustrationSignals: string[];
}

interface RRWebEvent {
    type: number;
    timestamp: number;
    data?: {
        source?: number;
        type?: number;
        tag?: string;
        text?: string;
        selector?: string;
        x?: number;
        y?: number;
        href?: string;
        plugin?: string;
        payload?: {
            level?: string;
            message?: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
}

export function summarizeRRWebEvents(events: RRWebEvent[]): RRWebEventSummary {
    const summary: RRWebEventSummary = {
        totalEvents: events.length,
        duration: 0,
        pageViews: [],
        clicks: { count: 0, elements: [], rageClicks: 0 },
        scrolls: { maxDepth: 0, rapidScrolls: 0 },
        inputs: { count: 0, fields: [] },
        errors: [],
        frustrationSignals: [],
    };

    if (events.length === 0) return summary;

    // Calculate duration
    const timestamps = events.map(e => e.timestamp).filter(Boolean);
    if (timestamps.length > 1) {
        summary.duration = Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000);
    }

    // Track clicks for rage detection
    const clickTimestamps: number[] = [];
    const clickElements = new Set<string>();
    const inputFields = new Set<string>();

    for (const event of events) {
        // Type 4 is Meta (page navigation)
        if (event.type === 4 && event.data?.href) {
            const path = new URL(event.data.href).pathname;
            if (!summary.pageViews.includes(path)) {
                summary.pageViews.push(path);
            }
        }

        // Type 3 is IncrementalSnapshot
        if (event.type === 3 && event.data) {
            // Source 2 is MouseInteraction
            if (event.data.source === 2) {
                // Type 2 is Click
                if (event.data.type === 2) {
                    summary.clicks.count++;
                    clickTimestamps.push(event.timestamp);

                    const selector = event.data.selector || event.data.tag || 'unknown';
                    clickElements.add(selector);
                }
            }

            // Source 3 is Scroll
            if (event.data.source === 3) {
                const scrollY = (event.data as { y?: number }).y || 0;
                if (scrollY > summary.scrolls.maxDepth) {
                    summary.scrolls.maxDepth = scrollY;
                }
            }

            // Source 5 is Input
            if (event.data.source === 5) {
                summary.inputs.count++;
                const selector = event.data.selector || 'unknown';
                inputFields.add(selector);
            }
        }

        // Type 6 is Plugin (often used for errors)
        if (event.type === 6 && event.data?.plugin === 'rrweb/console@1') {
            const level = event.data.payload?.level;
            const message = event.data.payload?.message;
            if (level === 'error' && message) {
                summary.errors.push(redactPII(String(message).slice(0, 100)));
            }
        }
    }

    // Convert sets to arrays
    summary.clicks.elements = Array.from(clickElements).slice(0, 10);
    summary.inputs.fields = Array.from(inputFields).slice(0, 10);

    // Detect rage clicks (3+ clicks within 1 second)
    clickTimestamps.sort((a, b) => a - b);
    for (let i = 0; i < clickTimestamps.length - 2; i++) {
        if (clickTimestamps[i + 2] - clickTimestamps[i] < 1000) {
            summary.clicks.rageClicks++;
            summary.frustrationSignals.push(`Rage click detected at ${new Date(clickTimestamps[i]).toISOString()}`);
        }
    }

    // Detect rapid scrolling (frustration signal)
    // This is a simplified check - could be more sophisticated
    if (summary.scrolls.maxDepth > 3000) {
        summary.frustrationSignals.push('Extensive scrolling detected - user may be searching for content');
    }

    return summary;
}

/**
 * Sanitize click data for AI
 */
export interface SanitizedClick {
    x: number;
    y: number;
    element: string;
    count: number;
}

export function sanitizeClickData(clicks: Array<{ x: number; y: number; selector?: string; count?: number }>): SanitizedClick[] {
    return clicks.slice(0, 50).map(click => ({
        x: click.x,
        y: click.y,
        element: click.selector || 'unknown',
        count: click.count || 1,
    }));
}

/**
 * Sanitize scroll data for AI
 */
export interface SanitizedScrollData {
    depths: number[];
    avgDepth: number;
    maxDepth: number;
    reachBottom: number;
}

export function sanitizeScrollData(scrolls: Array<{ depth: number; count?: number }>): SanitizedScrollData {
    const depths = scrolls.map(s => s.depth);
    const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    const reachBottom = depths.filter(d => d >= 90).length;

    return {
        depths: depths.slice(0, 20),
        avgDepth: Math.round(avgDepth),
        maxDepth,
        reachBottom,
    };
}

/**
 * Sanitize session metadata for AI
 */
export interface SanitizedSessionMeta {
    device: string;
    browser: string;
    country: string;
    duration: number;
    pagesVisited: number;
    isReturning: boolean;
}

export function sanitizeSessionMeta(session: {
    device_type?: string;
    user_agent?: string;
    country?: string;
    duration?: number;
    pages?: string[];
    visitor_id?: string;
    is_returning?: boolean;
}): SanitizedSessionMeta {
    // Extract browser from user agent
    let browser = 'Unknown';
    const ua = session.user_agent || '';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    return {
        device: session.device_type || 'desktop',
        browser,
        country: session.country || 'Unknown',
        duration: session.duration || 0,
        pagesVisited: session.pages?.length || 0,
        isReturning: session.is_returning || false,
    };
}

/**
 * Sanitize feedback data for AI
 */
export function sanitizeFeedbackData(feedback: Array<{
    message?: string;
    rating?: number;
    type?: string;
    created_at?: string;
}>): Array<{
    message: string;
    rating: number | null;
    type: string;
    date: string;
}> {
    return feedback.slice(0, 50).map(f => ({
        message: redactPII(f.message || ''),
        rating: f.rating ?? null,
        type: f.type || 'general',
        date: f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Unknown',
    }));
}

/**
 * Sanitize experiment data for AI
 */
export interface SanitizedExperimentData {
    name: string;
    variants: Array<{
        name: string;
        users: number;
        conversions: number;
        rate: number;
    }>;
    totalUsers: number;
    significance: boolean;
    confidence: number;
}

export function sanitizeExperimentData(experiment: {
    name?: string;
    variants?: Array<{
        name?: string;
        users?: number;
        conversions?: number;
        conversion_rate?: number;
    }>;
    total_users?: number;
    is_significant?: boolean;
    confidence_level?: number;
}): SanitizedExperimentData {
    return {
        name: experiment.name || 'Unnamed Experiment',
        variants: (experiment.variants || []).map(v => ({
            name: v.name || 'Unnamed',
            users: v.users || 0,
            conversions: v.conversions || 0,
            rate: v.conversion_rate || 0,
        })),
        totalUsers: experiment.total_users || 0,
        significance: experiment.is_significant || false,
        confidence: experiment.confidence_level || 0,
    };
}
