// Ledger offline shell service worker.
//
// Goal: a page the person has opened once while online keeps opening with
// zero network later - no browser "you're offline" page, no Next.js error
// screen. Bump CACHE_VERSION whenever this file's *caching strategy*
// changes (not on every deploy - the runtime cache self-updates on every
// successful fetch, so stale content isn't a real risk day to day).
const CACHE_VERSION = "v2";
const STATIC_CACHE = `ledger-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ledger-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// How long we wait for the network before serving a cached copy of a page.
// This is what makes a slow/flaky connection (not just a fully offline
// one) feel instant instead of hanging - we still keep trying the network
// in the background and refresh the cache the moment it answers.
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Lets the app tell this worker to forget everything it has cached - used
// on logout, so a shared/kiosk device signing into a different business
// doesn't keep serving the previous business's pages while offline.
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("sw-timeout")), ms));
}

async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    // Cache storage can be full or unavailable (e.g. Safari private mode) -
    // never let a caching failure break the actual response.
  }
}

// Build assets under /_next/static are content-hashed and immutable, so
// once we have a copy there's never a reason to ask the network again.
async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      await putInCache(RUNTIME_CACHE, request, response.clone());
    }

    return response;
  } catch {
    // This asset was never cached and the device is offline.
    // Do not let the service worker throw an unhandled error.
    return new Response("", {
      status: 503,
      statusText: "Offline asset unavailable",
      headers: {
        "Content-Type": "application/javascript",
      },
    });
  }
}

// Everything else same-origin: try the network (racing a short timeout for
// navigations so a slow backend doesn't hang the page), fall back to the
// last cached copy of this exact request on failure, and keep refreshing
// the cache in the background once the network does answer.
async function networkFirst(request) {
  const isNavigation = request.mode === "navigate";

  try {
    const response = await (
      isNavigation
        ? Promise.race([
            fetch(request),
            timeout(NAV_TIMEOUT_MS),
          ])
        : fetch(request)
    );

    if (response && response.ok) {
      await putInCache(
        RUNTIME_CACHE,
        request,
        response.clone()
      );
    }

    return response;
  } catch {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    // For Next.js RSC requests, try a cache match without
    // depending on the exact query string.
    const url = new URL(request.url);

    if (url.searchParams.has("_rsc")) {
      const baseUrl = new URL(url.origin + url.pathname);

      const keys = await caches
        .open(RUNTIME_CACHE)
        .then((cache) => cache.keys());

      const matchingRequest = keys.find((key) => {
        const keyUrl = new URL(key.url);

        return (
          keyUrl.origin === baseUrl.origin &&
          keyUrl.pathname === baseUrl.pathname &&
          keyUrl.searchParams.has("_rsc")
        );
      });

      if (matchingRequest) {
        const rscCached = await caches.match(matchingRequest);
        if (rscCached) return rscCached;
      }
    }

    if (isNavigation) {
      const offline = await caches.match(OFFLINE_URL);

      if (offline) {
        return offline;
      }
    }

    throw new Error("sw-fetch-failed");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept mutations (server actions post here) - they must
  // succeed or fail exactly as before, so the existing offline outbox
  // queue in lib/offline/outbox.ts keeps deciding what happens on failure.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
