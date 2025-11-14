// This file must be a Client Component
"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

// If you have a types/supabase.ts file, import Database
// import { Database } from '@/types/supabase';
// If not, you can use 'any' for now, but type safety is recommended
type Database = any;

export default function Login() {
  const supabase = createClientComponentClient<Database>();
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

  // This logic handles redirecting the user if they are already logged in
  // or after they successfully sign in.
  useEffect(() => {
    setMounted(true); // Ensures this runs only on the client

    const handleAuthChange = async () => {
      // Check for redirect toast message from proxy cookie
      const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
        const [key, value] = cookie.split("=");
        acc[key] = decodeURIComponent(value);
        return acc;
      }, {} as Record<string, string>);

      if (cookies["x-toast-message"]) {
        toast.error(cookies["x-toast-message"]);
        // Clear the cookie
        document.cookie = "x-toast-message=; max-age=0; path=/";
      }

      // Check for OAuth code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      // 1. Check if user is already logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session || code) {
        router.replace("/dashboard");
        return;
      }

      // 2. Listen for future sign-in events
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          event === "SIGNED_IN" &&
          session?.user &&
          !hasShownToastRef.current
        ) {
          hasShownToastRef.current = true;
          // Pass email via URL parameter for toast notification
          const email = encodeURIComponent(session.user.email || "user");
          router.replace(`/dashboard?login=success&email=${email}`);
        }
      });

      return () => subscription?.unsubscribe();
    };

    handleAuthChange();
  }, [router, supabase]);

  // Prevents the login form from flashing if the user is already logged in
  // and being redirected.
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        {/* You can add a branded "Navlens" loading spinner here */}
      </div>
    );
  }

  // Check if we're on the root path with OAuth code, redirect to /login
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const code = urlParams.get("code");
  if (
    code &&
    typeof window !== "undefined" &&
    window.location.pathname === "/"
  ) {
    router.replace("/login?code=" + code);
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-blue-50">
      {/* 1. Your Navlens Logo */}
      <div className="mb-2">
        <Image
          src="/images/navlens.png"
          alt="Navlens Logo"
          width={120}
          height={60}
          priority
          className="drop-shadow-[0_0_20px_rgba(0,200,200,0.4)]"
        />
      </div>

      {/* 2. The Themed Authentication Card */}
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-50 rounded-2xl shadow-[0_8px_32px_rgba(0,200,200,0.15)] border-2 border-blue-200">
        <Auth
          supabaseClient={supabase}
          // Add providers you enabled in your Supabase project
          providers={["google"]}
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
