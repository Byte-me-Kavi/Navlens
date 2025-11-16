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
      }
    },
    [pathname, router]
  );

  useEffect(() => {
    // Close spinner immediately when pathname changes (page has loaded)
    if (isNavigating) {
      // Use setTimeout to avoid synchronous state updates in effects
      const timeoutId = setTimeout(() => {
        setIsNavigating(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [pathname, isNavigating]);

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
