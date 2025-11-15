"use client";

import SideNavbar from "@/components/SideNavbar";
import Header from "@/components/Header";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Toast } from "@/components/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    // Check for login success from cookie set by proxy
    const timer = setTimeout(() => {
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

        // Clear success cookies after showing toast
        setTimeout(() => {
          document.cookie =
            "x-login-success=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie =
            "x-user-email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }, 100);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Toast>
      <div
        suppressHydrationWarning
        className="flex h-screen bg-blue-50 overflow-hidden"
      >
        {/* Side Navigation */}
        <SideNavbar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </Toast>
  );
}
