"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PresentationChartBarIcon,
  HomeIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  BeakerIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import { useNavigation } from "@/context/NavigationContext";

const navItems = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    name: "My Sites",
    href: "/dashboard/my-sites",
    icon: GlobeAltIcon,
  },
  {
    name: "Heatmaps",
    href: "/dashboard/heatmaps",
    icon: PresentationChartBarIcon,
  },
  {
    name: "Sessions",
    href: "/dashboard/sessions",
    icon: EyeIcon,
  },
  {
    name: "Funnels",
    href: "/dashboard/funnels",
    icon: FunnelIcon,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Cog6ToothIcon,
  },
  {
    name: "Experiments",
    href: "/dashboard/experiments",
    icon: BeakerIcon,
    badge: "Soon",
  },
];

interface SideNavbarProps {
  onClose?: () => void;
}

export default function SideNavbar({ onClose }: SideNavbarProps) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const { navigateTo, isNavigating } = useNavigation();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || null);
        const userMetadata = session.user.user_metadata;
        if (userMetadata?.avatar_url) {
          setUserImage(userMetadata.avatar_url);
        }
      }
    };

    getUser();

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

      navigateTo("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="w-56 bg-white/90 backdrop-blur-sm border-r border-gray-200 flex flex-col h-screen shadow-sm">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex justify-center items-center flex-1"
          >
            <Image
              src="/images/navlens.png"
              alt="Navlens"
              width={52}
              height={35}
              priority
              style={{ width: "auto", height: "auto" }}
              className="drop-shadow-sm md:w-10 md:h-9 w-10 h-7"
            />
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Close Menu"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          const handleNavClick = (e: React.MouseEvent) => {
            e.preventDefault();
            navigateTo(item.href);
            onClose?.();
          };

          return (
            <button
              key={item.name}
              onClick={handleNavClick}
              className={`
                w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm font-medium"
                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                }
                `}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : ""}`} />
              <span className={isActive ? "font-semibold" : "font-medium"}>
                {item.name}
              </span>
              {item.badge && (
                <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Info - Mobile Only */}
      <div className="md:hidden p-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center gap-3">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                setUserImage(null);
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg border border-gray-200">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {userEmail || "User"}
            </p>
            <p className="text-xs text-gray-500">Account</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isNavigating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">
            {isNavigating ? "Logging out..." : "Logout"}
          </span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200">
        <div className="text-[10px] text-gray-500 text-center">
          <p className="font-semibold text-gray-900">Navlens Analytics</p>
          <p className="mt-0.5">Heatmap MVP v1.0</p>
        </div>
      </div>
    </aside>
  );
}
