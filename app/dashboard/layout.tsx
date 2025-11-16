"use client";

import SideNavbar from "@/components/SideNavbar";
import Header from "@/components/Header";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Toast } from "@/components/Toast";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    // Show success toast when cookies are set by proxy after OAuth
    const showLoginToast = () => {
      if (hasShownToastRef.current) return;

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

      if (isLoginSuccess && email && !hasShownToastRef.current) {
        hasShownToastRef.current = true;

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
      if (event === "SIGNED_IN" && session?.user && !hasShownToastRef.current) {
        hasShownToastRef.current = true;
        toast.success(`Welcome back! Logged in as ${session.user.email}`, {
          duration: 5000,
        });
      }
    });

    return () => subscription?.unsubscribe();
  }, []); // Empty dependency array - run only on mount

  return (
    <Toast>
      <div className="flex h-screen bg-gray-50">
        <SideNavbar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 p-5 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </Toast>
  );
}
