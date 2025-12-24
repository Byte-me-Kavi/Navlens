"use client";

import { Toast } from "../components/Toast";
import { AnimatedBackground } from "../components/ui/AnimatedBackground";
import CookieConsent from "../components/CookieConsent";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <body
      className="antialiased bg-linear-to-br from-white via-blue-50/30 to-purple-50/20"
      suppressHydrationWarning
    >
      {/* Global Animated Background - Hide on dashboard pages */}
      {!isDashboard && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <AnimatedBackground />
        </div>
      )}

      {/* All page content */}
      <div className="relative z-10">
        <Toast>{children}</Toast>
      </div>

      {/* Cookie Consent Banner */}
      <CookieConsent />
    </body>
  );
}
