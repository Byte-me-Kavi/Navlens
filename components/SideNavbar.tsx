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
} from "@heroicons/react/24/outline";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
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
    href: "/dashboard/heatmap-viewer",
    icon: PresentationChartBarIcon,
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
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        throw error;
      }

      sessionStorage.clear();
      localStorage.clear();
      router.push("/login");

      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-blue-200 flex flex-col h-screen shadow-lg">
      {/* Logo Section */}
      <div className="p-6 border-b border-blue-200">
        <div className="flex justify-between items-center">
          <Link
            href="/dashboard"
            className="flex justify-center items-center flex-1"
          >
            <Image
              src="/images/navlens.png"
              alt="Navlens"
              width={80}
              height={40}
              priority
              style={{ width: "auto", height: "auto" }}
              className="drop-shadow-[0_0_10px_rgba(0,200,200,0.3)]"
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
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const { navigateTo } = useNavigation();

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
                w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${
                  isActive
                    ? "bg-linear-to-r from-blue-100 to-blue-50 text-blue-900 border-l-4 border-blue-600 shadow-sm"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }
                `}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : ""}`} />
              <span className="font-medium">{item.name}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Info - Mobile Only */}
      <div className="md:hidden p-4 border-t border-blue-200 space-y-3">
        <div className="flex items-center gap-3">
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
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              {userEmail || "User"}
            </p>
            <p className="text-xs text-gray-500">Account</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-blue-200">
        <div className="text-xs text-gray-500 text-center">
          <p className="font-semibold text-blue-900">Navlens Analytics</p>
          <p className="mt-1">Heatmap MVP v1.0</p>
        </div>
      </div>
    </aside>
  );
}
