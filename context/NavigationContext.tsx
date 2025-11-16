"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";

interface NavigationContextType {
  isNavigating: boolean;
  navigateTo: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = useCallback(
    (path: string) => {
      if (path !== pathname) {
        setIsNavigating(true);
        router.push(path);
        // Don't set an immediate timeout - wait for actual page load
      }
    },
    [pathname, router]
  );

  useEffect(() => {
    if (isNavigating) {
      // Wait for the page to actually render and stabilize (longer timeout for data fetching)
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 1500); // Increased from 500ms to 1500ms to wait for actual page load + data fetching

      return () => clearTimeout(timer);
    }
  }, [isNavigating, pathname]);

  return (
    <NavigationContext.Provider value={{ isNavigating, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
