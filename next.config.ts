import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
            value: "POST, OPTIONS", // Allow POST and the preflight OPTIONS request
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type", // Allow the 'application/json' header
          },
        ],
      },
    ];
  },
};

export default nextConfig;
