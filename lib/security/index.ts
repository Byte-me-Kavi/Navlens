/**
 * Security Module Exports
 * 
 * Centralized security utilities for:
 * - Rate limiting
 * - CORS protection
 * - Origin validation
 */

export {
    isRateLimited,
    getClientIP,
    rateLimitHeaders,
    RATE_LIMITS,
} from './rateLimit';

export {
    secureCorsHeaders,
    trackerCorsHeaders,
    validateOriginForSite,
} from './cors';

export {
    requestQueue,
    RequestQueue,
} from './requestQueue';
