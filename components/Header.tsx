"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useState } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { usePathname } from "next/navigation";
import { useAI } from "@/context/AIProvider";
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  SparklesIcon,
  CreditCardIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { navigateTo, isNavigating } = useNavigation();
  const pathname = usePathname();
  const { openChat } = useAI();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);

  // Helper function to get page title based on current pathname
  const getPageTitle = () => {
    if (
      pathname?.includes("/dashboard/sessions") &&
      !pathname?.includes("[session-id]")
    ) {
      return "Navlens Analytics Sessions Dashboard";
    }
    if (pathname?.includes("/dashboard/sessions/[session-id]")) {
      return "Navlens Session Replay";
    }
    if (pathname?.includes("/dashboard/heatmaps")) {
      return "Navlens Analytics Heatmaps";
    }
    if (pathname?.includes("/dashboard/experiments")) {
      return "Navlens Analytics Experiments";
    }
    if (pathname?.includes("/dashboard/my-sites")) {
      return "Navlens Analytics My Sites";
    }
    if (pathname?.includes("/dashboard/settings")) {
      return "Navlens Analytics Settings";
    }
    if (pathname?.includes("/dashboard")) {
      return "Navlens Analytics Dashboard";
    }
    if (pathname?.includes("/dashboard/funnels")) {
      return "Navlens Analytics Funnels";
    }
    if (pathname?.includes("/dashboard/frustration-signals")) {
      return "Navlens Analytics Frustration Signals";
    }
    if (pathname?.includes("/dashboard/feedback")) {
      return "Navlens Analytics Feedback";
    }
    if (pathname?.includes("/dashboard/form-analytics")) {
      return "Navlens Analytics Form Analytics";
    }
    return "Navlens Analytics Dashboard";
  };

  // Helper function to get cached image from localStorage
  const getCachedImage = (userEmail: string) => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(`profile_image_${userEmail}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.url || null;
      }
    } catch (error) {
      console.error("Error reading cached image:", error);
    }
    return null;
  };

  // Helper function to cache image in localStorage
  const cacheImage = (userEmail: string, imageUrl: string | null) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        `profile_image_${userEmail}`,
        JSON.stringify({ url: imageUrl, timestamp: Date.now() })
      );
    } catch (error) {
      console.error("Error caching image:", error);
    }
  };

  // Helper function to process user image
  const processUserImage = useCallback(
    (
      userMetadata: Record<string, unknown> | undefined,
      email: string | null | undefined
    ) => {
      if (!email) return null;

      // Check if there's a profile image URL from metadata
      const imageUrl = (userMetadata?.avatar_url as string | undefined) || null;

      if (imageUrl) {
        // Check if it's different from cached version
        const cachedUrl = getCachedImage(email);
        if (cachedUrl !== imageUrl) {
          // New image, cache it
          cacheImage(email, imageUrl);
          return imageUrl;
        }
        // Use cached version if same
        return cachedUrl || imageUrl;
      } else {
        // No image, remove cache
        cacheImage(email, null);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || null;
        setUserEmail(email);

        // First try to get cached image
        if (email) {
          const cachedImage = getCachedImage(email);
          if (cachedImage) {
            setUserImage(cachedImage);
            return; // Use cached image
          }
        }

        // If no cache, process metadata
        const userMetadata = session.user.user_metadata;
        const processedImage = processUserImage(userMetadata, email);
        setUserImage(processedImage);
      }
    };

    getUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || null;
        setUserEmail(email);

        const userMetadata = session.user.user_metadata;
        const processedImage = processUserImage(userMetadata, email);
        setUserImage(processedImage);
      } else {
        setUserEmail(null);
        setUserImage(null);
        // Clear cache when logging out
        if (typeof window !== "undefined") {
          try {
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith("profile_image_")) {
                localStorage.removeItem(key);
              }
            });
          } catch (error) {
            console.error("Error clearing cache:", error);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, processUserImage]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        throw error;
      }

      // Only clear Supabase auth keys, preserve tracking and other session data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") ||
            key.startsWith("supabase") ||
            key.startsWith("profile_image_"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear session storage auth keys
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith("sb-") || key.startsWith("supabase"))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

      // Navigate to home page (this will trigger the navigation loading state)
      navigateTo("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200">
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
            {getPageTitle()}
          </h1>
        </div>

        {/* Right Section - User Info & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {/* Notification, Help & AI Buttons */}
          <div className="flex items-center gap-1 md:gap-2">
            <button
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Notifications (Coming Soon)"
            >
              <BellIcon className="w-5 h-5" />
            </button>
            <button
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Help (Coming Soon)"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
            {/* AI Assistant Button */}
            <button
              onClick={() => openChat('dashboard')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg text-white transition-all shadow-sm"
              title="Ask Navlens AI"
            >
              <SparklesIcon className="w-5 h-5 text-white" />
              <span className="text-xs font-medium text-white">Navlens AI</span>  
            </button>
          </div>

          {/* Desktop: User Info with Dropdown */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200 relative">
            <button
              onClick={() => setShowDesktopMenu(!showDesktopMenu)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="text-right">
                <p className="text-xs font-medium text-gray-900">
                  {userEmail || "User"}
                </p>
                <p className="text-[10px] text-gray-500">Account</p>
              </div>
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    setUserImage(null);
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </button>

            {/* Desktop Dropdown Menu */}
            {showDesktopMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDesktopMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userEmail || "User"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigateTo("/dashboard/subscription");
                      setShowDesktopMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CreditCardIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">Manage Subscription</span>
                  </button>
                  <button
                    onClick={() => {
                      navigateTo("/dashboard/settings");
                      setShowDesktopMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">Settings</span>
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowDesktopMenu(false);
                      }}
                      disabled={isNavigating}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {isNavigating ? "Logging out..." : "Logout"}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile: Avatar with Dropdown */}
          <div className="md:hidden relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1 border-l border-gray-200 pl-2"
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    setUserImage(null);
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userEmail || "User"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigateTo("/dashboard/subscription");
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CreditCardIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">Manage Subscription</span>
                  </button>
                  <button
                    onClick={() => {
                      navigateTo("/dashboard/settings");
                      setShowMobileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">Settings</span>
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowMobileMenu(false);
                      }}
                      disabled={isNavigating}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {isNavigating ? "Logging out..." : "Logout"}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
