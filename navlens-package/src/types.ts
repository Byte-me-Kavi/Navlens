/**
 * Navlens Analytics SDK
 * Core TypeScript definitions
 */

export interface NavlensConfig {
    /**
     * Your unique site ID from the Navlens dashboard
     */
    siteId: string;

    /**
     * Your API key from the Navlens dashboard
     */
    apiKey: string;

    /**
     * API endpoint (defaults to Navlens cloud)
     */
    apiEndpoint?: string;

    /**
     * Enable debug mode for console logging
     */
    debug?: boolean;

    /**
     * Automatically start tracking on init
     * @default true
     */
    autoTrack?: boolean;

    /**
     * Enable session recording
     * @default true
     */
    sessionRecording?: boolean;

    /**
     * Enable click tracking
     * @default true
     */
    clickTracking?: boolean;

    /**
     * Enable scroll tracking
     * @default true
     */
    scrollTracking?: boolean;

    /**
     * Enable form analytics
     * @default true
     */
    formAnalytics?: boolean;

    /**
     * Respect Do Not Track browser setting
     * @default true
     */
    respectDoNotTrack?: boolean;

    /**
     * Cookie consent required before tracking
     * @default false
     */
    requireConsent?: boolean;

    /**
     * Mask all input values for privacy
     * @default true
     */
    maskInputs?: boolean;

    /**
     * CSS selectors to exclude from tracking
     */
    excludeSelectors?: string[];

    /**
     * Page paths to exclude from tracking
     */
    excludePaths?: string[];
}

export interface NavlensInstance {
    /**
     * Initialize Navlens tracking
     */
    init: (config: NavlensConfig) => void;

    /**
     * Start tracking (if autoTrack was false)
     */
    start: () => void;

    /**
     * Stop all tracking
     */
    stop: () => void;

    /**
     * Track a custom event
     */
    track: (eventName: string, properties?: Record<string, unknown>) => void;

    /**
     * Identify the current user
     */
    identify: (userId: string, traits?: Record<string, unknown>) => void;

    /**
     * Set user consent status
     */
    setConsent: (consent: boolean) => void;

    /**
     * Get current consent status
     */
    getConsent: () => boolean;

    /**
     * Reset user session
     */
    reset: () => void;

    /**
     * Check if Navlens is initialized
     */
    isInitialized: () => boolean;

    /**
     * Get current session ID
     */
    getSessionId: () => string | null;

    /**
     * Get current visitor ID
     */
    getVisitorId: () => string | null;
}

export interface TrackEventOptions {
    /**
     * Custom event name
     */
    name: string;

    /**
     * Additional properties to attach
     */
    properties?: Record<string, unknown>;

    /**
     * Override timestamp
     */
    timestamp?: Date;
}

export type ConsentStatus = 'pending' | 'accepted' | 'declined';

export interface ConsentPreferences {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
}
