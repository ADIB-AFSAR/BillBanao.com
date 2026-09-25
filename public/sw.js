// Ledger offline shell service worker.

const CACHE_VERSION = "v3";

const STATIC_CACHE = `ledger-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ledger-runtime-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key !== STATIC_CACHE &&
              key !== RUNTIME_CACHE
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

/*
 * Clear only runtime/business-page caches.
 *
 * IMPORTANT:
 * Do not delete STATIC_CACHE on logout.
 * Static JS/CSS chunks are not business-specific and should remain
 * available so the app can boot offline after another login.
 */
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(
      caches.delete(RUNTIME_CACHE)
    );
  }
});

function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("sw-timeout"));
    }, ms);
  });
}

async function putInCache(cacheName, request, response) {
  try {
    if (!response || !response.ok) return;

    const cache = await caches.open(cacheName);

    await cache.put(
      request,
      response
    );
  } catch {
    // Cache failures must never break the real response.
  }
}

/*
 * Static Next.js assets:
 *
 * - Return cached copy immediately if available.
 * - Otherwise fetch from network.
 * - Cache successful response.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      await putInCache(
        STATIC_CACHE,
        request,
        response.clone()
      );
    }

    return response;
  } catch {
    return new Response("", {
      status: 503,
      statusText: "Offline asset unavailable",
    });
  }
}

/*
 * Full page navigation:
 *
 * Online:
 *   network -> cache successful page
 *
 * Offline/slow:
 *   cached page -> offline.html
 */
async function navigationRequest(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      timeout(NAV_TIMEOUT_MS),
    ]);

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

    const offline = await caches.match(
      OFFLINE_URL
    );

    if (offline) {
      return offline;
    }

    return new Response(
      "You are offline.",
      {
        status: 503,
        statusText: "Offline",
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }
}

/*
 * IMPORTANT:
 *
 * We intentionally do NOT cache arbitrary RSC requests here.
 *
 * Next.js generates different ?_rsc= query strings and these are not
 * interchangeable HTML pages. Returning one RSC response for another
 * route/request can produce "Something went wrong" and hydration errors.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept POST/PUT/PATCH/DELETE.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Only handle our own origin.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never intercept the service worker itself.
  if (url.pathname === "/sw.js") {
    return;
  }

  /*
   * Next.js immutable static assets.
   */
  if (
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      cacheFirst(request)
    );

    return;
  }

  /*
   * Next image optimization.
   */
  if (
    url.pathname.startsWith("/_next/image")
  ) {
    event.respondWith(
      cacheFirst(request)
    );

    return;
  }

  /*
   * Full browser navigation.
   *
   * This is the important offline shell path.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      navigationRequest(request)
    );

    return;
  }

  /*
   * Do NOT intercept:
   *
   * - RSC requests
   * - prefetch requests
   * - arbitrary Next.js GET requests
   * - API GET requests
   *
   * Let Next.js/browser handle them normally.
   */
});