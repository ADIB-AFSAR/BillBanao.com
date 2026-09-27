// Ledger offline shell service worker.
//
// GENERATED FILE - public/sw.js is written by scripts/generate-sw.mjs as
// part of `npm run build`; this file (public/sw.template.js) is the
// source. Don't hand-edit public/sw.js - it gets overwritten on the next
// build.
//
// BUILD_ID and PRECACHE_ASSETS are baked directly into the generated
// file's bytes. That's deliberate: it's what makes every new build
// produce a genuinely *different* sw.js, which is the one thing that
// reliably tells the browser "a new version is available, please
// reinstall and drop the old caches." Without that, a page cached from an
// old build could go on referencing JS/CSS chunks that no longer exist on
// disk after a redeploy - and referencing a missing chunk while offline is
// exactly what produces a client-side crash ("Something went wrong")
// instead of a working offline page.

const BUILD_ID = __BUILD_ID__;
const PRECACHE_ASSETS = __PRECACHE_ASSETS__;

const STATIC_CACHE = `ledger-static-${BUILD_ID}`;
const RUNTIME_CACHE = `ledger-runtime-${BUILD_ID}`;
const OFFLINE_URL = "/offline.html";
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Per-file, not cache.addAll(): addAll() fails its *entire* batch if
      // even one URL 404s, which would mean one renamed/missing asset
      // silently prevents every other asset - including offline.html -
      // from ever getting precached. But a failure here must still be
      // VISIBLE - silently swallowing it is exactly what makes "some
      // pages work offline, others crash with a missing chunk" impossible
      // to diagnose. Check DevTools -> Application -> Service Workers ->
      // "Inspect" (or the regular Console, while a page is loading) for
      // this build's install log.
      const results = await Promise.all(
        [OFFLINE_URL, ...PRECACHE_ASSETS].map((url) =>
          cache.add(url).then(
            () => ({ url, ok: true }),
            (err) => ({ url, ok: false, error: err instanceof Error ? err.message : String(err) })
          )
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        console.error(
          `[sw] build ${BUILD_ID}: FAILED to precache ${failed.length}/${results.length} asset(s) - these will only work offline if fetched successfully some other way first:`,
          failed
        );
      } else {
        console.log(`[sw] build ${BUILD_ID}: precached all ${results.length} asset(s).`);
      }
    })()
  );
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

/*
 * Messages from the page:
 * - "CLEAR_CACHES": wipe the business-data runtime cache on logout (never
 *   the static asset cache - JS/CSS isn't business-specific and a shared
 *   device signing into a different business still needs it to boot
 *   offline).
 * - {type:"WARM_ROUTE", url}: fetch and cache one route's real page HTML.
 *   Done here, in the worker, rather than by the page writing into Cache
 *   Storage directly - that way there is exactly one place that needs to
 *   know the current cache name (this file), instead of every caller
 *   having to hardcode a name that changes on every build.
 */
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
    return;
  }
  if (event.data && event.data.type === "WARM_ROUTE" && typeof event.data.url === "string") {
    event.waitUntil(warmRoute(event.data.url));
  }
});

async function warmRoute(url) {
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(new Request(new URL(url, self.location.origin).toString()), response.clone());
  } catch {
    // Not reachable right now - nothing to warm this time.
  }
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("sw-timeout")), ms));
}

async function putInCache(cacheName, request, response) {
  try {
    if (!response || !response.ok) return;
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    // Cache failures must never break the real response.
  }
}

/*
 * Next.js static assets. Precached at install from PRECACHE_ASSETS, but
 * still cache-first here too, in case something wasn't in that list (e.g.
 * a font requested via @font-face that no page's initial HTML links to
 * directly).
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await putInCache(STATIC_CACHE, request, response.clone());
    return response;
  } catch {
    return new Response("", { status: 503, statusText: "Offline asset unavailable" });
  }
}

/*
 * Full page navigation - the important offline-shell path.
 * Online: network (racing a short timeout) -> cache the successful page.
 * Offline/slow: cached page -> offline.html.
 */
async function navigationRequest(request) {
  try {
    const response = await Promise.race([fetch(request), timeout(NAV_TIMEOUT_MS)]);
    if (response && response.ok) await putInCache(RUNTIME_CACHE, request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("You are offline.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept mutations - server actions post here, and must
  // succeed or fail exactly as before so the offline outbox in
  // lib/offline/outbox.ts keeps deciding what happens on failure.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationRequest(request));
    return;
  }

  /*
   * Intentionally NOT intercepted: RSC fetches, prefetches, and any other
   * same-origin GET. Next.js tags client-router requests with headers
   * (RSC, Next-Router-State-Tree, ...) that make the SAME URL return a
   * DIFFERENT response body (an RSC payload, not full HTML) - answering
   * one from a cache entry meant for the other produces exactly the
   * "Something went wrong" hydration crash this file exists to prevent.
   * NavLink (components/layout/nav-link.tsx) already forces a real
   * navigation whenever the browser is offline, so there's no case where
   * an RSC fetch genuinely needs to succeed with no connection - letting
   * the browser handle these normally, online or off, is correct.
   */
});
