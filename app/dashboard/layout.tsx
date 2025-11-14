"use client";

import SideNavbar from "@/components/SideNavbar";
import Header from "@/components/Header";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check for login success in URL parameters
    const loginStatus = searchParams.get("login");
    const email = searchParams.get("email");

    if (loginStatus === "success" && email) {
      toast.success(`Welcome back! Logged in as ${decodeURIComponent(email)}`);
      // Clean up URL by removing the query parameters
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  return (
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
  );
}
