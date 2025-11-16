import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-blue-100">
      {/* Main Footer Content */}
      <div className="py-16 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/images/logo.png"
                  alt="Navlens Logo"
                  width={60}
                  height={60}
                  className="drop-shadow-[0_0_20px_rgba(0,200,200,0.5)]"
                />
                <h3 className="text-2xl font-bold bg-linear-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                  Navlens
                </h3>
              </div>
              <p className="text-gray-900 text-sm leading-relaxed mb-6">
                Transform user behavior into actionable insights with AI-powered
                heatmaps and analytics.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                <a
                  href="mailto:contact@navlens.com"
                  className="w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-900 transition-all duration-200 hover:scale-110"
                >
                  <span className="sr-only">Email</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-900 transition-all duration-200 hover:scale-110"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-900 transition-all duration-200 hover:scale-110"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                {[
                  "Features",
                  "Pricing",
                  "Documentation",
                  "API Reference",
                  "Changelog",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-gray-900 hover:text-gray-600 transition-colors text-sm flex items-center gap-2 group"
                    >
                      <span className="w-0 group-hover:w-4 h-px bg-gray-600 transition-all duration-200" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                {["About Us", "Blog", "Careers", "Press Kit", "Contact"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-gray-900 hover:text-gray-600 transition-colors text-sm flex items-center gap-2 group"
                      >
                        <span className="w-0 group-hover:w-4 h-px bg-blue-600 transition-all duration-200" />
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-3">
                {[
                  "Help Center",
                  "Community",
                  "Tutorials",
                  "Status",
                  "Partners",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-gray-900/70 hover:text-gray-600 transition-colors text-sm flex items-center gap-2 group"
                    >
                      <span className="w-0 group-hover:w-4 h-px bg-gray-600 transition-all duration-200" />
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="py-8 px-8 bg-linear-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 mb-12">
            <div className="max-w-2xl mx-auto text-center">
              <h4 className="text-blue-900 font-bold text-lg mb-2">
                Stay Updated
              </h4>
              <p className="text-blue-900/70 text-sm mb-6">
                Get the latest features, updates, and tips delivered to your
                inbox.
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg border border-blue-200 bg-white text-blue-900 placeholder:text-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button className="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-500/20 text-sm">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-blue-100 py-6 px-6 bg-blue-50/50">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-blue-900/60 text-sm">
              © 2025 Navlens. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
                (item) => (
                  <a
                    key={item}
                    href="#"
                    className="text-blue-900/60 hover:text-blue-600 transition-colors"
                  >
                    {item}
                  </a>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
