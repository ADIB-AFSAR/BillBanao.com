"use client";

import { useEffect } from "react";

// The offline-critical surface: pages that should keep opening with zero
// network once the person has been online at least once this session.
const OFFLINE_ROUTES = [
  "/dashboard",
  "/billing",
  "/invoices",
  "/customers",
  "/products",
  "/categories",
  "/team",
  "/settings",
  "/plans",
];

// Clicking a sidebar link does a *client-side* transition: Next.js fetches
// just the RSC payload for the target route, tagged with router-specific
// headers. The service worker caches that fine, but it is a different
// cached response than what a hard reload or a brand-new tab asks for (a
// plain, header-less GET, which is what a real browser navigation sends).
// That mismatch is exactly why some pages worked offline and others didn't
// after just clicking around: only pages reached via an actual reload had
// the "real page" variant cached.
//
// A plain fetch() with no special headers gets that same real-page variant
// a reload would, so calling it here for every core route - once per
// session, and again whenever the connection comes back - is what makes
// the service worker's cache complete regardless of how the person actually
// navigated the app.
async function warmRoutes() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return;

  for (const route of OFFLINE_ROUTES) {
    try {
      await fetch(route, { credentials: "same-origin", cache: "no-store" });
    } catch {
      // Genuinely offline (or this route is briefly unreachable) - stop
      // rather than let every remaining route also fail one by one.
      break;
    }
  }
}

/**
 * Mounted once in AppShell (which stays mounted across client-side
 * navigation within the authenticated area), so this runs once per app
 * session rather than on every page change - plus again any time the
 * connection is restored after being offline.
 */
export function OfflineRouteWarmer() {
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) void warmRoutes();
    };

    run();
    window.addEventListener("online", run);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
    };
  }, []);

  return null;
}
