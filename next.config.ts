import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
  experimental: {
  },
  // CORS headers are handled dynamically in API route handlers
  // This allows proper handling of credentials and specific origins
  // See: app/api/v1/ingest/route.ts, app/api/dom-snapshot/route.ts, etc.

  // CRITICAL: This tells Next.js to let these packages manage their own files
  // Required for @sparticuz/chromium to work properly in Vercel serverless functions
};

export default nextConfig;
