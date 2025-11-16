"use client";

import { createContext, useContext, useCallback, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const navigateTo = useCallback(
    (path: string) => {
      if (path !== pathname) {
        console.log(`[Navigation] Starting navigation to: ${path}`);
        startTransition(() => {
          router.push(path);
        });
      }
    },
    [pathname, router]
  );

  return (
    <NavigationContext.Provider value={{ isNavigating: isPending, navigateTo }}>
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
