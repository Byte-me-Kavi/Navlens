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
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  ChevronUpDownIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FireIcon,
  ChartBarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState, useRef } from "react";
import { useNavigation } from "@/context/NavigationContext";
import { useSite } from "@/app/context/SiteContext";

// Group definitions
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Standalone items (always visible)
const standaloneItems: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: HomeIcon },
  { name: "My Sites", href: "/dashboard/my-sites", icon: GlobeAltIcon },
];

// Grouped navigation items
const navGroups: NavGroup[] = [
  {
    name: "Analytics",
    icon: ChartBarIcon,
    defaultOpen: true,
    items: [
      { name: "Heatmaps", href: "/dashboard/heatmaps", icon: PresentationChartBarIcon },
      { name: "Sessions", href: "/dashboard/sessions", icon: EyeIcon },
      { name: "Funnels", href: "/dashboard/funnels", icon: FunnelIcon },
      { name: "Form Analytics", href: "/dashboard/form-analytics", icon: DocumentChartBarIcon },
    ],
  },
  {
    name: "Insights",
    icon: FireIcon,
    items: [
      { name: "Frustration Signals", href: "/dashboard/frustration-signals", icon: ExclamationTriangleIcon },
      { name: "Performance", href: "/dashboard/performance", icon: PresentationChartBarIcon},
      { name: "User Journeys", href: "/dashboard/journey", icon: FunnelIcon},
      { name: "Cohorts", href: "/dashboard/cohorts", icon: UserGroupIcon},
    ],
  },
  {
    name: "Feedback",
    icon: DocumentChartBarIcon,
    items: [
      { name: "User Feedback", href: "/dashboard/feedback", icon: DocumentChartBarIcon },
    ],
  },
];

// Footer items
const footerItems: NavItem[] = [
  { name: "Experiments", href: "/dashboard/experiments", icon: BeakerIcon, badge: "Soon" },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

interface SideNavbarProps {
  onClose?: () => void;
}

export default function SideNavbar({ onClose }: SideNavbarProps) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['Analytics']));
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { navigateTo, isNavigating } = useNavigation();
  const { 
    selectedSiteId, 
    setSelectedSiteId, 
    sites, 
    sitesLoading, 
    getSiteById,
    fetchSites 
  } = useSite();

  const currentSite = selectedSiteId ? getSiteById(selectedSiteId) : null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch sites on mount
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Auto-expand groups containing active items
  useEffect(() => {
    navGroups.forEach((group) => {
      if (isGroupActive(group)) {
        setOpenGroups((prev) => new Set([...prev, group.name]));
      }
    });
  }, [pathname]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || null);
        const userMetadata = session.user.user_metadata;
        if (userMetadata?.avatar_url) {
          setUserImage(userMetadata.avatar_url);
        }
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      if (error) throw error;
      
      // Only clear Supabase auth keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.startsWith("supabase") || key.startsWith("profile_image_"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      navigateTo("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigateTo(href);
    onClose?.();
  };

  const renderNavItem = (item: NavItem, isNested = false) => {
    const isActive = item.href === '/dashboard'
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;

    return (
      <button
        key={item.name}
        onClick={handleNavClick(item.href)}
        className={`
          w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm
          ${isNested ? 'pl-9' : ''}
          ${isActive
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
  };

  const renderGroup = (group: NavGroup) => {
    const isOpen = openGroups.has(group.name);
    const hasActive = isGroupActive(group);
    const Icon = group.icon;

    return (
      <div key={group.name} className="mb-1">
        <button
          onClick={() => toggleGroup(group.name)}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm
            ${hasActive ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
          `}
        >
          <Icon className={`w-4 h-4 ${hasActive ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className={`flex-1 text-left font-medium ${hasActive ? 'text-blue-900' : 'text-gray-700'}`}>
            {group.name}
          </span>
          {isOpen ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {isOpen && (
          <div className="mt-1 space-y-0.5">
            {group.items.map((item) => renderNavItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="flex justify-center items-center flex-1">
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

      {/* Global Site Selector */}
      <div className="p-3 border-b border-gray-200" ref={dropdownRef}>
        <div className="relative">
          <button
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            disabled={sitesLoading}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white hover:bg-blue-50 border border-gray-200 rounded-lg transition-all text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GlobeAltIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-medium text-gray-900 truncate">
                {sitesLoading ? "Loading..." : currentSite ? currentSite.site_name : sites.length === 0 ? "No sites" : "Select site..."}
              </span>
            </div>
            <ChevronUpDownIcon className="w-4 h-4 text-gray-500 shrink-0" />
          </button>

          {/* Site Dropdown Menu */}
          {siteDropdownOpen && !sitesLoading && sites.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    setSiteDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                    selectedSiteId === site.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <GlobeAltIcon className={`w-4 h-4 shrink-0 ${selectedSiteId === site.id ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${selectedSiteId === site.id ? 'font-semibold text-blue-900' : 'font-medium text-gray-900'}`}>
                      {site.site_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{site.domain}</p>
                  </div>
                  {selectedSiteId === site.id && <CheckIcon className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* No sites dropdown */}
          {siteDropdownOpen && !sitesLoading && sites.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <p className="text-sm text-gray-600 text-center mb-2">No sites yet</p>
              <button
                onClick={() => {
                  navigateTo("/dashboard/my-sites");
                  setSiteDropdownOpen(false);
                  onClose?.();
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first site →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Standalone items */}
        {standaloneItems.map((item) => renderNavItem(item))}
        
        {/* Divider */}
        <div className="my-2 border-t border-gray-100" />
        
        {/* Grouped items */}
        {navGroups.map((group) => renderGroup(group))}
        
        {/* Divider */}
        <div className="my-2 border-t border-gray-100" />
        
        {/* Footer items */}
        {footerItems.map((item) => renderNavItem(item))}
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
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-lg">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{userEmail || "User"}</p>
            <p className="text-xs text-gray-500">Account</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isNavigating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">{isNavigating ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}
