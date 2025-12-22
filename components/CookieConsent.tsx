"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { XMarkIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

const COOKIE_CONSENT_KEY = "navlens_cookie_consent";

type ConsentStatus = "pending" | "accepted" | "declined";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (status: ConsentStatus, prefs?: CookiePreferences) => {
    const consentData = {
      status,
      preferences: prefs || preferences,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    setIsVisible(false);

    // Dispatch custom event so other components can react to consent change
    window.dispatchEvent(
      new CustomEvent("cookieConsentChange", { detail: consentData })
    );
  };

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    setPreferences(allAccepted);
    saveConsent("accepted", allAccepted);
  };

  const handleDeclineNonEssential = () => {
    const essentialOnly = { essential: true, analytics: false, marketing: false };
    setPreferences(essentialOnly);
    saveConsent("declined", essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent("accepted", preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Main Banner */}
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  We Value Your Privacy
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  We use cookies to enhance your experience, analyze site traffic, and
                  for marketing purposes. By clicking &quot;Accept All&quot;, you consent to our
                  use of cookies.{" "}
                  <Link
                    href="/privacy"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Read our Privacy Policy
                  </Link>
                </p>

                {/* Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAcceptAll}
                    className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 text-sm"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleDeclineNonEssential}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 text-sm"
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
                  >
                    {showDetails ? "Hide Details" : "Customize"}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleDeclineNonEssential}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Detailed Preferences */}
          {showDetails && (
            <div className="border-t border-gray-200 p-6 bg-gray-50/50">
              <h4 className="font-semibold text-gray-900 mb-4">
                Cookie Preferences
              </h4>
              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <h5 className="font-medium text-gray-900">
                      Essential Cookies
                    </h5>
                    <p className="text-sm text-gray-600">
                      Required for the website to function. Cannot be disabled.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="sr-only"
                    />
                    <div className="w-11 h-6 bg-blue-600 rounded-full">
                      <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <h5 className="font-medium text-gray-900">
                      Analytics Cookies
                    </h5>
                    <p className="text-sm text-gray-600">
                      Help us understand how visitors interact with our website.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences((p) => ({ ...p, analytics: !p.analytics }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      preferences.analytics ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        preferences.analytics ? "right-0.5" : "left-0.5"
                      }`}
                    ></span>
                  </button>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <h5 className="font-medium text-gray-900">
                      Marketing Cookies
                    </h5>
                    <p className="text-sm text-gray-600">
                      Used to track visitors across websites for advertising.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences((p) => ({ ...p, marketing: !p.marketing }))
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      preferences.marketing ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        preferences.marketing ? "right-0.5" : "left-0.5"
                      }`}
                    ></span>
                  </button>
                </div>
              </div>

              {/* Save Preferences Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  className="px-6 py-2.5 bg-linear-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 text-sm"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Utility function to check consent status (can be used by other components)
export function getCookieConsent(): {
  status: ConsentStatus;
  preferences: CookiePreferences;
} | null {
  if (typeof window === "undefined") return null;
  
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!consent) return null;
  
  try {
    return JSON.parse(consent);
  } catch {
    return null;
  }
}

// Utility function to check if a specific cookie type is allowed
export function isCookieTypeAllowed(type: keyof CookiePreferences): boolean {
  const consent = getCookieConsent();
  if (!consent) return type === "essential"; // Default: only essential
  return consent.preferences[type];
}
