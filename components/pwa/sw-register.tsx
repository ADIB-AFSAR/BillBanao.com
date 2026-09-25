"use client";

import { useEffect } from "react";

/**
 * Tells the active service worker to drop every cached page. Call this
 * right before logging out on a shared/kiosk device, so the next person
 * who signs in doesn't have this business's billing screen, dashboard, etc.
 * still openable offline from the cache.
 */
export async function clearOfflineCaches(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  registration?.active?.postMessage("CLEAR_CACHES");
}

/**
 * Registers the offline shell worker (public/sw.js). Mounted once in the
 * root layout. Registration failing (unsupported browser, blocked by a
 * privacy setting) is not fatal - everything else in the app, including
 * the billing screen's own IndexedDB cache and outbox, works the same
 * either way; this only adds "pages I've already opened keep opening with
 * zero network."
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
  .register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  })
  .then((registration) => {
    console.log("SW registered:", registration.scope);
  })
  .catch((error) => {
    console.error("SW registration failed:", error);
  });
  }, []);

  return null;
}
