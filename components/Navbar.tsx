"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export function Navbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "About", href: "/about" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push("/")}
          >
            <Image
              src="/images/logo.png"
              alt="Navlens Logo"
              width={60}
              height={60}
              className="drop-shadow-sm"
            />
            <h2 className="text-gray-900 text-2xl font-bold">Navlens</h2>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-700 px-3 py-2 rounded-md hover:text-blue-600 hover:bg-blue-100 transition-colors duration-200 font-medium text-sm"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-2 text-gray-700 border border-gray-900 rounded-md hover:text-blue-600 hover:border-blue-600 transition-colors duration-200 font-medium text-sm"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-2 bg-blue-600 border border-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md shadow-blue-600/30 transition-all duration-200 font-medium text-sm"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-slate-800 relative w-8 h-8 flex items-center justify-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bars3Icon
              className={`w-6 h-6 absolute transition-all duration-300 ${
                isOpen
                  ? "rotate-90 opacity-0 scale-0"
                  : "rotate-0 opacity-100 scale-100"
              }`}
            />
            <XMarkIcon
              className={`w-6 h-6 absolute transition-all duration-300 ${
                isOpen
                  ? "rotate-0 opacity-100 scale-100"
                  : "-rotate-90 opacity-0 scale-0"
              }`}
            />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-gray-200 mt-4 ${
            isOpen
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0 border-t-0 mt-0"
          }`}
        >
          <div className="pt-4 pb-4 space-y-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block text-gray-600 hover:text-slate-900 transition-colors duration-200 font-medium"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => {
                  router.push("/login");
                  setIsOpen(false);
                }}
                className="w-full px-6 py-2 text-gray-600 border-2 border-gray-200 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-all duration-200 font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  router.push("/login");
                  setIsOpen(false);
                }}
                className="w-full px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold shadow-md hover:bg-slate-900"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
