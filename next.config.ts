import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // The offline shell service worker (public/sw.js) must always be
  // re-fetched fresh - if a browser cached an old copy of the worker
  // itself, updates to the caching logic would never take effect.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
