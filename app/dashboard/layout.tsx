"use client";

import SideNavbar from "@/components/SideNavbar";
import Header from "@/components/Header";
import NavigationLoader from "@/components/NavigationLoader";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Toast } from "@/components/Toast";
import { createBrowserClient } from "@supabase/ssr";
import { NavigationProvider } from "@/context/NavigationContext";
import { SiteProvider } from "@/app/context/SiteContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Show success toast when cookies are set by proxy after OAuth
    const showLoginToast = () => {
      // Check localStorage to prevent showing toast more than once per session
      const toastShown = localStorage.getItem("navlens_welcome_toast_shown");
      if (toastShown) return;

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
        // Mark that we've shown the toast
        localStorage.setItem("navlens_welcome_toast_shown", "true");

        // Show toast
        toast.success(`Welcome back! Logged in as ${email}`, {
          duration: 5000,
        });

        // Clear success cookies IMMEDIATELY after showing toast
        document.cookie =
          "x-login-success=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "x-user-email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    };

    // Only check on component mount, not on every render
    showLoginToast();

    // Also listen for auth state changes from Supabase (ONLY for actual sign-in events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only show toast on initial sign-in, not on every state change
      if (event === "SIGNED_IN" && session?.user) {
        // Check if we already showed this session's welcome toast
        const toastShown = localStorage.getItem("navlens_welcome_toast_shown");
        if (!toastShown) {
          localStorage.setItem("navlens_welcome_toast_shown", "true");
          toast.success(`Welcome back! Logged in as ${session.user.email}`, {
            duration: 5000,
          });
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [supabase.auth]); // Include supabase.auth in dependencies

  return (
    <Toast>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar - Hidden on mobile */}
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
      <NavigationLoader />
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
