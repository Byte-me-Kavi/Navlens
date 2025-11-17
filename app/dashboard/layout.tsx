"use client";

import SideNavbar from "@/components/SideNavbar";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { Toast } from "@/components/Toast";
import { createBrowserClient } from "@supabase/ssr";
import { NavigationProvider, useNavigation } from "@/context/NavigationContext";
import { SiteProvider } from "@/app/context/SiteContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);
  const { isNavigating } = useNavigation();

  // Use a ref to track if we've processed the login toast in this mount instance
  const processedLoginToast = useRef(false);

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

  // ... rest of your useEffect for loading state ...
  useEffect(() => {
    // Determine correct loading state based on URL
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthRedirect = urlParams.has("code") || urlParams.has("state");
    const isDashboardPath = window.location.pathname.startsWith("/dashboard");

    // For dashboard paths, set loading to false immediately
    if (isDashboardPath && !isOAuthRedirect) {
      console.log(
        "[Dashboard Layout] Setting loading to false immediately for dashboard path"
      );
      setIsLoading(false);
      return;
    }

    // For other paths, use a timer
    const delay = isOAuthRedirect ? 2000 : 800;
    console.log(
      `[Dashboard Layout] Setting loading to false after ${delay}ms delay`
    );
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-50 transition-opacity duration-500 ease-out">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <Toast>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <SideNavbar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div
          className={`fixed top-0 left-0 h-screen w-64 z-50 md:hidden transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SideNavbar onClose={() => setSidebarOpen(false)} />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-5 overflow-x-hidden">{children}</main>
        </div>
      </div>
      {isNavigating && (
        <div className="fixed inset-0 z-50">
          <LoadingSpinner message="Navigating..." />
        </div>
      )}
    </Toast>
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
