import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Billing App",          // your real app name
    short_name: "Billing",
    start_url: "/billing",        // opens straight into the billing screen
    scope: "/",
    display: "standalone",        // no browser address bar, looks like a desktop app
    background_color: "#ffffff",
    theme_color: "#1a1a1a",       // match your brand colour
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}   