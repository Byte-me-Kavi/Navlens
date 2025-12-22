/**
 * Navlens Analytics SDK
 * Core module for tracking user behavior
 * 
 * @example
 * ```typescript
 * import { navlens } from 'navlens';
 * 
 * navlens.init({
 *   siteId: 'your-site-id',
 *   apiKey: 'your-api-key'
 * });
 * ```
 */

import type { NavlensConfig, NavlensInstance } from './types';

// Default configuration
const DEFAULT_CONFIG: Partial<NavlensConfig> = {
    apiEndpoint: 'https://navlens-rho.vercel.app',
    debug: false,
    autoTrack: true,
    sessionRecording: true,
    clickTracking: true,
    scrollTracking: true,
    formAnalytics: true,
    respectDoNotTrack: true,
    requireConsent: false,
    maskInputs: true,
    excludeSelectors: [],
    excludePaths: [],
};

// State
let isInitialized = false;
let config: NavlensConfig | null = null;
let hasConsent = true;
let scriptElement: HTMLScriptElement | null = null;

// Utility functions
function log(...args: unknown[]) {
    if (config?.debug) {
        console.log('[Navlens]', ...args);
    }
}

function warn(...args: unknown[]) {
    console.warn('[Navlens]', ...args);
}

function shouldTrack(): boolean {
    // Check Do Not Track
    if (config?.respectDoNotTrack && typeof navigator !== 'undefined') {
        if (navigator.doNotTrack === '1' || (navigator as any).globalPrivacyControl) {
            log('Tracking disabled: Do Not Track enabled');
            return false;
        }
    }

    // Check consent
    if (config?.requireConsent && !hasConsent) {
        log('Tracking disabled: Consent not given');
        return false;
    }

    return true;
}

function injectTrackerScript() {
    if (typeof document === 'undefined') {
        log('Not in browser environment, skipping script injection');
        return;
    }

    if (scriptElement) {
        log('Tracker script already injected');
        return;
    }

    if (!shouldTrack()) {
        return;
    }

    scriptElement = document.createElement('script');
    scriptElement.src = `${config!.apiEndpoint}/tracker.js`;
    scriptElement.async = true;
    scriptElement.setAttribute('data-site-id', config!.siteId);
    scriptElement.setAttribute('data-api-key', config!.apiKey);

    if (config!.debug) {
        scriptElement.setAttribute('data-debug', 'true');
    }

    if (!config!.sessionRecording) {
        scriptElement.setAttribute('data-disable-recording', 'true');
    }

    if (!config!.clickTracking) {
        scriptElement.setAttribute('data-disable-clicks', 'true');
    }

    if (!config!.scrollTracking) {
        scriptElement.setAttribute('data-disable-scroll', 'true');
    }

    if (!config!.formAnalytics) {
        scriptElement.setAttribute('data-disable-forms', 'true');
    }

    if (config!.maskInputs) {
        scriptElement.setAttribute('data-mask-inputs', 'true');
    }

    if (config!.excludeSelectors && config!.excludeSelectors.length > 0) {
        scriptElement.setAttribute('data-exclude-selectors', config!.excludeSelectors.join(','));
    }

    if (config!.excludePaths && config!.excludePaths.length > 0) {
        scriptElement.setAttribute('data-exclude-paths', config!.excludePaths.join(','));
    }

    document.head.appendChild(scriptElement);
    log('Tracker script injected');
}

function removeTrackerScript() {
    if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
        scriptElement = null;
        log('Tracker script removed');
    }
}

// Get window.navlens if available (from tracker script)
function getTrackerInstance(): any {
    if (typeof window !== 'undefined' && (window as any).navlensTracker) {
        return (window as any).navlensTracker;
    }
    return null;
}

/**
 * Navlens Analytics instance
 */
export const navlens: NavlensInstance = {
    init(userConfig: NavlensConfig) {
        if (isInitialized) {
            warn('Navlens already initialized');
            return;
        }

        if (!userConfig.siteId || !userConfig.apiKey) {
            throw new Error('Navlens: siteId and apiKey are required');
        }

        config = { ...DEFAULT_CONFIG, ...userConfig } as NavlensConfig;
        isInitialized = true;

        log('Initialized with config:', config);

        if (config.autoTrack) {
            this.start();
        }
    },

    start() {
        if (!isInitialized) {
            warn('Navlens not initialized. Call navlens.init() first.');
            return;
        }

        injectTrackerScript();
    },

    stop() {
        removeTrackerScript();

        // Also stop the tracker instance if it exists
        const tracker = getTrackerInstance();
        if (tracker?.stop) {
            tracker.stop();
        }

        log('Tracking stopped');
    },

    track(eventName: string, properties?: Record<string, unknown>) {
        if (!isInitialized || !shouldTrack()) {
            return;
        }

        const tracker = getTrackerInstance();
        if (tracker?.track) {
            tracker.track(eventName, properties);
        } else {
            // Queue the event if tracker not ready yet
            log('Queuing event (tracker not ready):', eventName, properties);
        }
    },

    identify(userId: string, traits?: Record<string, unknown>) {
        if (!isInitialized) {
            warn('Navlens not initialized');
            return;
        }

        const tracker = getTrackerInstance();
        if (tracker?.identify) {
            tracker.identify(userId, traits);
        }

        log('User identified:', userId);
    },

    setConsent(consent: boolean) {
        hasConsent = consent;
        log('Consent set to:', consent);

        if (consent && isInitialized && config?.requireConsent) {
            this.start();
        } else if (!consent) {
            this.stop();
        }
    },

    getConsent() {
        return hasConsent;
    },

    reset() {
        const tracker = getTrackerInstance();
        if (tracker?.reset) {
            tracker.reset();
        }
        log('Session reset');
    },

    isInitialized() {
        return isInitialized;
    },

    getSessionId() {
        const tracker = getTrackerInstance();
        return tracker?.getSessionId?.() || null;
    },

    getVisitorId() {
        const tracker = getTrackerInstance();
        return tracker?.getVisitorId?.() || null;
    },
};

// Export types
export * from './types';

// Default export
export default navlens;
