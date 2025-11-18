import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@sparticuz/chromium'],
  turbopack: {},
  async headers() {
    return [
      {
        // We want to apply these headers to our API route
        // This will match /api/analytics/collect
        source: "/api/analytics/collect",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // This allows ANY domain to send requests
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, OPTIONS", // Allow POST and the preflight OPTIONS requests
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type", // Allow the 'application/json' header
          },
        ],
      },
    ];
  },

  // CRITICAL: This tells Next.js to let these packages manage their own files
  // Required for @sparticuz/chromium to work properly in Vercel serverless functions
};

export default nextConfig;
