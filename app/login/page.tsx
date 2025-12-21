// This file must be a Client Component
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Login() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const hasShownToastRef = useRef(false);

  // --- Define your Navlens Brand Colors ---
  const themeColors = {
    primary: "#FFFFFF", // White - main brand color
    accent: "#2A9AD0", // Teal accent
    electricBlue: "#007FFF", // Electric blue
    magenta: "#FF00FF", // Magenta glow
    purple: "#8A2BE2", // Purple from logo
    dark: "#1A1A1A", // Dark text
    lightGray: "#F5F5F5", // Light background
    cardBg: "#FFFFFF", // White card
    inputBg: "#FFFFFF", // Input backgrounds
    border: "#E0E0E0", // Borders
    textDark: "#333333", // Dark text
  };

  // Show error toast from proxy redirect cookie and listen for auth changes
  useEffect(() => {
    // Get redirect parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect');
    const planId = urlParams.get('plan');
    const errorCode = urlParams.get('error_code');
    const errorDescription = urlParams.get('error_description');

    // Handle Banned User Error
    if (errorCode === 'user_banned' && !hasShownToastRef.current) {
        hasShownToastRef.current = true; // Prevent double toast
        // Small timeout to Ensure toast library is ready
        setTimeout(() => {
             toast.error(
                "Access Denied: Your account has been suspended. Please contact support.",
                { duration: 6000, icon: '🚫' }
            );
        }, 100);
        
        // Clean URL without reload
        window.history.replaceState({}, '', '/login');
        return; // Stop further processing
    }
    
    // Check if user is already logged in and redirect
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && !hasShownToastRef.current) {
        hasShownToastRef.current = true;
        document.cookie = "x-login-success=true; path=/; max-age=5";
        document.cookie = `x-user-email=${
          session.user.email || "user"
        }; path=/; max-age=5`;
        
        // Redirect to original destination if specified
        if (redirectPath) {
          const fullPath = planId ? `${redirectPath}?plan=${planId}` : redirectPath;
          console.log('[Login] Redirecting to:', fullPath);
          router.push(fullPath);
        } else {
          router.push("/dashboard");
        }
      }
    };
    checkSession();

    // Check for redirect toast message from proxy cookie
    const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
      const [key, value] = cookie.split("=");
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {} as Record<string, string>);

    if (cookies["x-toast-message"] && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      setTimeout(() => {
        toast.error(cookies["x-toast-message"]);
      }, 100);
      // Clear the cookie
      document.cookie = "x-toast-message=; max-age=0; path=/";
    }

    // Listen for auth state changes and handle redirect
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Login] Auth state change:", event, session?.user?.email);
      if (event === "SIGNED_IN" && session?.user && !hasShownToastRef.current) {
        hasShownToastRef.current = true;
        // Set success toast cookies
        document.cookie = "x-login-success=true; path=/; max-age=5";
        document.cookie = `x-user-email=${
          session.user.email || "user"
        }; path=/; max-age=5`;
        
        // Redirect to original destination or dashboard
        if (redirectPath) {
          const fullPath = planId ? `${redirectPath}?plan=${planId}` : redirectPath;
          console.log("[Login] Redirecting to:", fullPath);
          router.push(fullPath);
        } else {
          console.log("[Login] Redirecting to the dashboard...");
          router.push("/dashboard");
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [supabase.auth, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  return (
    <div className="min-h-screen text-gray-900 overflow-x-hidden flex flex-col items-center justify-center p-4 relative">
      {/* Background Gradient Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-linear-to-br from-blue-500 to-purple-500 opacity-10 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-linear-to-br from-purple-500 to-pink-500 opacity-10 blur-3xl -z-10" />

      {/* 1. Your Navlens Logo */}
      <Link className="mb-2 relative z-10" href="/">
        <Image
          src="/images/navlens.png"
          alt="Navlens Logo"
          width={120}
          height={60}
          priority
          className="drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
        />
      </Link>

      {/* 2. The Themed Authentication Card */}
      <div className="w-full max-w-md p-8 space-y-8 bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(59,130,246,0.15)] border border-blue-200 relative z-10">
        <Auth
          supabaseClient={supabase}
          // Add providers you enabled in your Supabase project
          providers={["google"]}
          redirectTo={
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : "/login"
          }
          socialLayout="horizontal"
          // This 'appearance' prop is where all the theming happens
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#335398", // Dark button
                  brandAccent: "#112A56", // Even darker on hover
                  brandButtonText: "white", // White text on button

                  defaultButtonBackground: "white",
                  defaultButtonBackgroundHover: themeColors.lightGray,
                  defaultButtonBorder: themeColors.border,
                  defaultButtonText: themeColors.textDark,

                  dividerBackground: themeColors.border,

                  inputBackground: themeColors.inputBg,
                  inputBorder: themeColors.border,
                  inputBorderHover: themeColors.accent,
                  inputBorderFocus: themeColors.accent,
                  inputText: themeColors.textDark,
                  inputLabelText: "#666666",
                  inputPlaceholder: "#999999",

                  messageText: themeColors.textDark,
                  messageTextDanger: "#335398",

                  anchorTextColor: "#335398", // Dark links (navy)
                  anchorTextHoverColor: themeColors.electricBlue, // Blue hover (matching logo)
                },
                space: {
                  buttonPadding: "12px 20px",
                  inputPadding: "12px 16px",
                },
                radii: {
                  borderRadiusButton: "10px",
                  buttonBorderRadius: "10px",
                  inputBorderRadius: "10px",
                },
                fontSizes: {
                  baseButtonSize: "15px",
                  baseInputSize: "15px",
                },
              },
            },
          }}
          // We force the 'light' theme
          theme="light"
        />
      </div>
    </div>
  );
}
