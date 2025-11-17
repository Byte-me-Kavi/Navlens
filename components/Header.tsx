"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

      // Redirect to home page
      router.push("/");

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
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-6">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Toggle Menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        {/* Left Section - Page Title/Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold text-blue-900">
            Navlens Dashboard
          </h1>
        </div>

        {/* Right Section - User Info & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {/* Notification & Help Buttons - Mobile: left of avatar, Desktop: normal position */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Notifications (Coming Soon)"
            >
              <BellIcon className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Help (Coming Soon)"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop: User Info with Logout */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-blue-200">
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

          {/* Desktop: Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>

          {/* Mobile: Avatar with Dropdown */}
          <div className="md:hidden relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1 border-l border-blue-200 pl-2"
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-blue-200"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    setUserImage(null);
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm border border-blue-200">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </button>

            {/* Mobile Dropdown Menu */}
            {showMobileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMobileMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-blue-200 py-2 z-20">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    <span className="font-medium">
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
