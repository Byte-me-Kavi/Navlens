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
} from "@heroicons/react/24/outline";

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

export default function SideNavbar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-blue-200 flex flex-col h-screen shadow-lg">
      {/* Logo Section */}
      <div className="p-6 border-b border-blue-200">
        <Link href="/dashboard" className="flex justify-center items-center">
          <Image
            src="/images/navlens.png"
            alt="Navlens"
            width={80}
            height={40}
            priority
            className="drop-shadow-[0_0_10px_rgba(0,200,200,0.3)]"
          />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
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
                <span className="ml-auto text-xs bg-navlens-purple/20 text-navlens-purple px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

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
