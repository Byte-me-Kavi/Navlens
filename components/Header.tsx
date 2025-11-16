"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

export default function Header() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || null);

        // Get user metadata image if available
        const userMetadata = session.user.user_metadata;
        if (userMetadata?.avatar_url) {
          setUserImage(userMetadata.avatar_url);
        }
      }
    };

    getUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email || null);
        const userMetadata = session.user.user_metadata;
        if (userMetadata?.avatar_url) {
          setUserImage(userMetadata.avatar_url);
        }
      } else {
        setUserEmail(null);
        setUserImage(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        throw error;
      }

      // Clear any stored data
      sessionStorage.clear();
      localStorage.clear();

      // Redirect to login page
      router.push("/login");

      // Force refresh after redirect
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white border-b border-blue-200 shadow-md">
      <div className="flex items-center justify-between px-6 py-6">
        {/* Left Section - Page Title/Breadcrumb */}
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-blue-900">
            Navlens Dashboard
          </h1>
        </div>

        {/* Right Section - User Info & Actions */}
        <div className="flex items-center gap-4">
          {/* Future: Notifications */}
          <button
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Notifications (Coming Soon)"
          >
            <BellIcon className="w-5 h-5" />
          </button>

          {/* Future: Help */}
          <button
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Help (Coming Soon)"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>

          {/* User Info */}
          <div className="flex items-center gap-3 pl-4 border-l border-blue-200">
            <div className="text-right">
              <p className="text-sm font-medium text-blue-900">
                {userEmail || "User"}
              </p>
              <p className="text-xs text-gray-500">Account</p>
            </div>
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border border-blue-200"
                onError={(e) => {
                  // If image fails to load, hide it and show fallback
                  e.currentTarget.style.display = "none";
                  setUserImage(null);
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg border border-blue-200">
                {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
