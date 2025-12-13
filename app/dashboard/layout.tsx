"use client";

import SideNavbar from "@/components/SideNavbar";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { createBrowserClient } from "@supabase/ssr";
import { SiteProvider, useSite } from "@/app/context/SiteContext";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { usePathname } from "next/navigation";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isNavigating } = useNavigation();
  const { fetchSites } = useSite(); // Get fetchSites from context
  const pathname = usePathname();

  // Check if we're on heatmap viewer page
  const isHeatmapViewer = pathname === "/dashboard/heatmaps/heatmap-viewer";

  // Use a ref to track if we've processed the login toast in this mount instance
  const processedLoginToast = useRef(false);
  const hasFetchedSites = useRef(false);

  // Track if component has mounted on client
  const [mounted, setMounted] = useState(false);

  // Calculate initial loading state synchronously - only on client side
  const getInitialLoadingState = () => {
    // Check if we're on the client side
    if (typeof window === "undefined") {
      return true; // Default to loading on server
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthRedirect = urlParams.has("code") || urlParams.has("state");
    const isDashboardPath = window.location.pathname.startsWith("/dashboard");

    // For dashboard paths, don't show loading
    if (isDashboardPath && !isOAuthRedirect) {
      return false;
    }

    // For OAuth redirects or other paths, show loading initially
    return true;
  };

  const [isLoading, setIsLoading] = useState(getInitialLoadingState);

  // Set mounted on client
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Fetch sites once when dashboard mounts (centralized fetch)
  useEffect(() => {
    if (!hasFetchedSites.current && mounted) {
      hasFetchedSites.current = true;
      console.log("🚀 Dashboard mounted - fetching sites (centralized)");
      fetchSites();
    }
  }, [mounted, fetchSites]);

  useEffect(() => {
    // Prevent running this logic multiple times if component re-renders
    if (processedLoginToast.current) return;

    // Only proceed if not loading (Toaster must be mounted)
    if (isLoading) return;

    // Mark that we've processed the login toast
    processedLoginToast.current = true;

    const showLoginToast = () => {
      // Check session storage - this persists across page reloads in the same tab
      const hasShownToast = sessionStorage.getItem("navlens_toast_shown");
      if (hasShownToast) return;

      // Parse cookies
      const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
        const [key, ...valueParts] = cookie.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          acc[key.trim()] = decodeURIComponent(value);
        }
        return acc;
      }, {} as Record<string, string>);

      const isLoginSuccess = cookies["x-login-success"] === "true";
      const email = cookies["x-user-email"];

      if (isLoginSuccess && email) {
        // Mark in session storage that we showed the toast
        sessionStorage.setItem("navlens_toast_shown", "true");

        // Dismiss any existing toasts to ensure a clean slate
        toast.dismiss();

        // Show success toast
        const toastId = toast.success(`Welcome back! Logged in as ${email}`, {
          duration: 0, // Disable auto-dismiss, we'll handle it manually
        });

        // Manually dismiss the toast after duration to ensure it disappears
        setTimeout(() => {
          toast.dismiss(toastId);
        }, 2000);

        // Clear cookies
        document.cookie =
          "x-login-success=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "x-user-email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    };

    showLoginToast();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Don't show toast here - middleware already shows it via cookies
      // This listener is just for detecting auth changes
    });

    return () => subscription?.unsubscribe();
  }, [isLoading, supabase.auth]); // Added isLoading to dependencies

  // Handle loading state transitions for OAuth redirects and other paths
  useEffect(() => {
    // If already not loading (dashboard paths), nothing to do
    if (!isLoading) return;

    // Only run on client side
    if (typeof window === "undefined") return;

    // Determine correct loading state based on URL
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthRedirect = urlParams.has("code") || urlParams.has("state");

    // Use a timer for OAuth redirects and other paths
    const delay = isOAuthRedirect ? 2000 : 800;
    console.log(
      `[Dashboard Layout] Setting loading to false after ${delay}ms delay`
    );
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading || !mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-50 transition-opacity duration-500 ease-out">
        <LoadingSpinner message="Authenticating..." />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50/30">
        {/* Desktop Sidebar - hide on heatmap viewer */}
        {!isHeatmapViewer && (
          <div className="hidden md:block">
            <SideNavbar />
          </div>
        )}

        {/* Mobile Sidebar Overlay - hide on heatmap viewer */}
        {!isHeatmapViewer && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer - hide on heatmap viewer */}
        {!isHeatmapViewer && (
          <div
            className={`fixed top-0 left-0 h-screen w-64 z-50 md:hidden transform transition-transform duration-300 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <SideNavbar onClose={() => setSidebarOpen(false)} />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - hide on heatmap viewer */}
          {!isHeatmapViewer && (
            <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          )}
          <main
            className={`flex-1 overflow-x-hidden ${
              isHeatmapViewer ? "p-0" : "p-4"
            }`}
          >
            <ErrorBoundary
              onError={(error, errorInfo) => {
                // Log to console in production for debugging
                console.error("[Dashboard Error]", error.message);
                console.error("[Dashboard Stack]", errorInfo.componentStack);
              }}
            >
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
      {isNavigating && (
        <div className="fixed inset-0 z-50">
          <LoadingSpinner message="Navigating..." />
        </div>
      )}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavigationProvider>
      <SiteProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </SiteProvider>
    </NavigationProvider>
  );
}
