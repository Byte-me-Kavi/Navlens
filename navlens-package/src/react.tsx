/**
 * Navlens Analytics SDK - React Integration
 * 
 * @example
 * ```tsx
 * import { NavlensProvider, useNavlens } from 'navlens/react';
 * 
 * function App() {
 *   return (
 *     <NavlensProvider siteId="your-site-id" apiKey="your-api-key">
 *       <YourApp />
 *     </NavlensProvider>
 *   );
 * }
 * 
 * function YourComponent() {
 *   const { track, identify } = useNavlens();
 *   
 *   const handleClick = () => {
 *     track('button_clicked', { buttonName: 'signup' });
 *   };
 * }
 * ```
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { navlens } from './index';
import type { NavlensConfig, NavlensInstance } from './types';

// Context for React components
interface NavlensContextValue {
  isInitialized: boolean;
  track: (eventName: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  setConsent: (consent: boolean) => void;
  getConsent: () => boolean;
  reset: () => void;
  getSessionId: () => string | null;
  getVisitorId: () => string | null;
}

const NavlensContext = createContext<NavlensContextValue | null>(null);

/**
 * Props for NavlensProvider component
 */
export interface NavlensProviderProps extends Omit<NavlensConfig, 'siteId' | 'apiKey'> {
  /**
   * Your unique site ID from the Navlens dashboard
   */
  siteId: string;
  
  /**
   * Your API key from the Navlens dashboard
   */
  apiKey: string;
  
  /**
   * React children
   */
  children: React.ReactNode;
}

/**
 * NavlensProvider - Wrap your app with this to enable analytics
 * 
 * @example
 * ```tsx
 * <NavlensProvider siteId="your-site-id" apiKey="your-api-key">
 *   <App />
 * </NavlensProvider>
 * ```
 */
export function NavlensProvider({
  children,
  siteId,
  apiKey,
  ...config
}: NavlensProviderProps) {
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      navlens.init({
        siteId,
        apiKey,
        ...config,
      });
      isInitializedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      navlens.stop();
    };
  }, [siteId, apiKey]);

  const contextValue: NavlensContextValue = {
    isInitialized: isInitializedRef.current,
    track: useCallback((eventName, properties) => {
      navlens.track(eventName, properties);
    }, []),
    identify: useCallback((userId, traits) => {
      navlens.identify(userId, traits);
    }, []),
    setConsent: useCallback((consent) => {
      navlens.setConsent(consent);
    }, []),
    getConsent: useCallback(() => {
      return navlens.getConsent();
    }, []),
    reset: useCallback(() => {
      navlens.reset();
    }, []),
    getSessionId: useCallback(() => {
      return navlens.getSessionId();
    }, []),
    getVisitorId: useCallback(() => {
      return navlens.getVisitorId();
    }, []),
  };

  return (
    <NavlensContext.Provider value={contextValue}>
      {children}
    </NavlensContext.Provider>
  );
}

/**
 * useNavlens - Hook to access Navlens tracking functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { track, identify } = useNavlens();
 *   
 *   const handlePurchase = () => {
 *     track('purchase_completed', { amount: 99.99, currency: 'USD' });
 *   };
 * }
 * ```
 */
export function useNavlens(): NavlensContextValue {
  const context = useContext(NavlensContext);
  
  if (!context) {
    throw new Error(
      'useNavlens must be used within a NavlensProvider. ' +
      'Wrap your app with <NavlensProvider siteId="..." apiKey="...">...</NavlensProvider>'
    );
  }
  
  return context;
}

/**
 * useTrack - Convenience hook for tracking events
 * 
 * @example
 * ```tsx
 * const track = useTrack();
 * track('button_clicked', { id: 'signup' });
 * ```
 */
export function useTrack() {
  const { track } = useNavlens();
  return track;
}

/**
 * useIdentify - Convenience hook for identifying users
 * 
 * @example
 * ```tsx
 * const identify = useIdentify();
 * identify('user_123', { email: 'user@example.com', plan: 'pro' });
 * ```
 */
export function useIdentify() {
  const { identify } = useNavlens();
  return identify;
}

/**
 * TrackOnMount - Component that tracks an event when mounted
 * 
 * @example
 * ```tsx
 * <TrackOnMount event="page_viewed" properties={{ page: 'pricing' }} />
 * ```
 */
export function TrackOnMount({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  const { track } = useNavlens();

  useEffect(() => {
    track(event, properties);
  }, [event, track]);

  return null;
}

/**
 * IdentifyOnMount - Component that identifies user when mounted
 * 
 * @example
 * ```tsx
 * <IdentifyOnMount userId={user.id} traits={{ email: user.email }} />
 * ```
 */
export function IdentifyOnMount({
  userId,
  traits,
}: {
  userId: string;
  traits?: Record<string, unknown>;
}) {
  const { identify } = useNavlens();

  useEffect(() => {
    identify(userId, traits);
  }, [userId, identify]);

  return null;
}

// Re-export core navlens instance for advanced usage
export { navlens } from './index';
export type { NavlensConfig, NavlensInstance } from './types';
