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

const BUILD_ID = "SQzSw4JvXNiCNNFDmAXbB";
const PRECACHE_ASSETS = ["/_next/static/chunks/03vzx8qrlb6gm.js","/_next/static/chunks/048s-t35yy_3p.js","/_next/static/chunks/06jxjnw8bfczc.js","/_next/static/chunks/0a__a9r4ib2hv.js","/_next/static/chunks/0cz1d0mv5g_q7.js","/_next/static/chunks/0d515mh_xv38t.js","/_next/static/chunks/0fy4h0ngk1igg.js","/_next/static/chunks/0hlps8p56uubf.js","/_next/static/chunks/0i810y987uykp.js","/_next/static/chunks/0jq-236j1xigz.js","/_next/static/chunks/0kg5rxqfvmy4g.js","/_next/static/chunks/0l--tx08yrxkf.js","/_next/static/chunks/0oeds6xg-zier.js","/_next/static/chunks/0ommgsdbbwv_k.js","/_next/static/chunks/0qx_xsatka97h.js","/_next/static/chunks/0w9uzxyjyz0df.js","/_next/static/chunks/0yda1q92mbih6.js","/_next/static/chunks/13dz3f165d_8d.js","/_next/static/chunks/1gc4gr6_yisq0.js","/_next/static/chunks/1hp7c4be4ef1o.js","/_next/static/chunks/1hxvhvyjp-kp6.js","/_next/static/chunks/1i9sz07mi7u3f.js","/_next/static/chunks/1k770t09lede9.js","/_next/static/chunks/1pi4_4v_swuoq.css","/_next/static/chunks/1rvbfgqqy5h6x.js","/_next/static/chunks/1xipwnu3k60_j.js","/_next/static/chunks/1_t0np6_ii-tw.js","/_next/static/chunks/21nx2omgnbjs3.js","/_next/static/chunks/21saxbxt7mx_d.js","/_next/static/chunks/228xc1v3es8eo.js","/_next/static/chunks/272ugywl02bgk.js","/_next/static/chunks/2cin3-r518p9t.js","/_next/static/chunks/2e0-zfykn3mrz.js","/_next/static/chunks/2j4qghvtzbvdh.js","/_next/static/chunks/2o5nacuxh73-f.js","/_next/static/chunks/2v713r4d-nmq1.js","/_next/static/chunks/2yt0x-ked7hlg.js","/_next/static/chunks/2_9k6kriygas5.js","/_next/static/chunks/31q14b-qnq44l.js","/_next/static/chunks/39ipat_km3fa9.js","/_next/static/chunks/3cfm3oo9ohcgc.js","/_next/static/chunks/3flio4pg-mgde.js","/_next/static/chunks/3fntmmi971322.js","/_next/static/chunks/3gti1qdk5epqn.js","/_next/static/chunks/3ky25g0p6a65_.js","/_next/static/chunks/3l_z8o8h6v0uf.js","/_next/static/chunks/3_-v6y3mazp_u.js","/_next/static/chunks/turbopack-06h0cuozlxrjg.js","/_next/static/media/ibm-plex-mono-cyrillic-400-normal.0m1ahpdxrpokj.woff2","/_next/static/media/ibm-plex-mono-cyrillic-400-normal.2-z93d2j9-3s0.woff","/_next/static/media/ibm-plex-mono-cyrillic-500-normal.1eaan1mch682e.woff","/_next/static/media/ibm-plex-mono-cyrillic-500-normal.26ox_itp_alxp.woff2","/_next/static/media/ibm-plex-mono-cyrillic-600-normal.0qipn60581k5b.woff2","/_next/static/media/ibm-plex-mono-cyrillic-600-normal.2so0eecqstp1p.woff","/_next/static/media/ibm-plex-mono-cyrillic-ext-400-normal.09jq5v9-1wf71.woff2","/_next/static/media/ibm-plex-mono-cyrillic-ext-400-normal.2iaubq2jy0rx3.woff","/_next/static/media/ibm-plex-mono-cyrillic-ext-500-normal.28wp48yubenc3.woff2","/_next/static/media/ibm-plex-mono-cyrillic-ext-500-normal.41yczc5zdkwdh.woff","/_next/static/media/ibm-plex-mono-cyrillic-ext-600-normal.0lqep3bw7v3wl.woff2","/_next/static/media/ibm-plex-mono-cyrillic-ext-600-normal.18owfse_hsbuz.woff","/_next/static/media/ibm-plex-mono-latin-400-normal.2lhng2ntocry9.woff","/_next/static/media/ibm-plex-mono-latin-400-normal.3xdfs0-p_zi4c.woff2","/_next/static/media/ibm-plex-mono-latin-500-normal.11q3guvgd1r20.woff2","/_next/static/media/ibm-plex-mono-latin-500-normal.1fgk-kmy-32_a.woff","/_next/static/media/ibm-plex-mono-latin-600-normal.0d95tbzh5g6jj.woff","/_next/static/media/ibm-plex-mono-latin-600-normal.30e0eqd5fxn92.woff2","/_next/static/media/ibm-plex-mono-latin-ext-400-normal.0nrwft7nlo5oa.woff","/_next/static/media/ibm-plex-mono-latin-ext-400-normal.1hjaitcyq2e2r.woff2","/_next/static/media/ibm-plex-mono-latin-ext-500-normal.1cuq9_67cn48n.woff2","/_next/static/media/ibm-plex-mono-latin-ext-500-normal.1tdw_l2v4yhc_.woff","/_next/static/media/ibm-plex-mono-latin-ext-600-normal.1h4gkbs1bbtv3.woff2","/_next/static/media/ibm-plex-mono-latin-ext-600-normal.2j6z_fq1740ug.woff","/_next/static/media/ibm-plex-mono-vietnamese-400-normal.2kzc8ichkozg5.woff","/_next/static/media/ibm-plex-mono-vietnamese-400-normal.3a7fs2yw914a9.woff2","/_next/static/media/ibm-plex-mono-vietnamese-500-normal.0s1z3n-ysad7w.woff2","/_next/static/media/ibm-plex-mono-vietnamese-500-normal.2g79xp9gzp1kn.woff","/_next/static/media/ibm-plex-mono-vietnamese-600-normal.1xowhcc_d3c84.woff2","/_next/static/media/ibm-plex-mono-vietnamese-600-normal.3o6zfpml9w8yy.woff","/_next/static/media/ibm-plex-sans-cyrillic-400-normal.1ob51yn_zh4f3.woff2","/_next/static/media/ibm-plex-sans-cyrillic-400-normal.2c9g56gofrre8.woff","/_next/static/media/ibm-plex-sans-cyrillic-500-normal.2r3_h99a4p2o6.woff","/_next/static/media/ibm-plex-sans-cyrillic-500-normal.3j8b5jptl4nhr.woff2","/_next/static/media/ibm-plex-sans-cyrillic-600-normal.0h3aaz4315ad-.woff","/_next/static/media/ibm-plex-sans-cyrillic-600-normal.1bd0br_i69opa.woff2","/_next/static/media/ibm-plex-sans-cyrillic-700-normal.18feapymqwhbh.woff2","/_next/static/media/ibm-plex-sans-cyrillic-700-normal.2l5m2m6-3_1r7.woff","/_next/static/media/ibm-plex-sans-cyrillic-ext-400-normal.3-2s2qyqt5syo.woff","/_next/static/media/ibm-plex-sans-cyrillic-ext-400-normal.39u3dp1q8vt28.woff2","/_next/static/media/ibm-plex-sans-cyrillic-ext-500-normal.37y6j4asgn87a.woff2","/_next/static/media/ibm-plex-sans-cyrillic-ext-500-normal.42ydqmu-69p6e.woff","/_next/static/media/ibm-plex-sans-cyrillic-ext-600-normal.0hanpnpn3ki-v.woff2","/_next/static/media/ibm-plex-sans-cyrillic-ext-600-normal.33q0gwxfwkcq9.woff","/_next/static/media/ibm-plex-sans-cyrillic-ext-700-normal.1dpp22a693y_f.woff2","/_next/static/media/ibm-plex-sans-cyrillic-ext-700-normal.2j0n2wowgjqls.woff","/_next/static/media/ibm-plex-sans-greek-400-normal.1d6bt9ufqnym6.woff","/_next/static/media/ibm-plex-sans-greek-400-normal.20ztly1_og8qv.woff2","/_next/static/media/ibm-plex-sans-greek-500-normal.0k99vu2yejv84.woff2","/_next/static/media/ibm-plex-sans-greek-500-normal.2kq1zw7ns-90j.woff","/_next/static/media/ibm-plex-sans-greek-600-normal.17-3491c_tfac.woff2","/_next/static/media/ibm-plex-sans-greek-600-normal.1mkps5wbbyo2a.woff","/_next/static/media/ibm-plex-sans-greek-700-normal.0y4gpqeqws6yv.woff2","/_next/static/media/ibm-plex-sans-greek-700-normal.2nhbs3yj9gl6i.woff","/_next/static/media/ibm-plex-sans-latin-400-normal.19i24--p24z3r.woff","/_next/static/media/ibm-plex-sans-latin-400-normal.1xf5nwxyfigak.woff2","/_next/static/media/ibm-plex-sans-latin-500-normal.14sc3d7sk_zzh.woff","/_next/static/media/ibm-plex-sans-latin-500-normal.2i4a1iuj6lbvw.woff2","/_next/static/media/ibm-plex-sans-latin-600-normal.2ovda_azncp9b.woff2","/_next/static/media/ibm-plex-sans-latin-600-normal.2wn5p1s7u3utm.woff","/_next/static/media/ibm-plex-sans-latin-700-normal.3cj1z__33gk9h.woff2","/_next/static/media/ibm-plex-sans-latin-700-normal.43_h0be0oa3u4.woff","/_next/static/media/ibm-plex-sans-latin-ext-400-normal.1d956-ol9h5w9.woff","/_next/static/media/ibm-plex-sans-latin-ext-400-normal.2wkl6p2bjtdkj.woff2","/_next/static/media/ibm-plex-sans-latin-ext-500-normal.1h2_ral94l6aj.woff2","/_next/static/media/ibm-plex-sans-latin-ext-500-normal.1zyjrbr0w_u4w.woff","/_next/static/media/ibm-plex-sans-latin-ext-600-normal.00ca59z0uilzq.woff","/_next/static/media/ibm-plex-sans-latin-ext-600-normal.0a5-aslyj_wbq.woff2","/_next/static/media/ibm-plex-sans-latin-ext-700-normal.14ri_qndij_e8.woff2","/_next/static/media/ibm-plex-sans-latin-ext-700-normal.22pgwkr6js0ec.woff","/_next/static/media/ibm-plex-sans-vietnamese-400-normal.3nx5do2g1gg_d.woff","/_next/static/media/ibm-plex-sans-vietnamese-400-normal.41bcgzntq2c9e.woff2","/_next/static/media/ibm-plex-sans-vietnamese-500-normal.14rtxflq2gk6f.woff","/_next/static/media/ibm-plex-sans-vietnamese-500-normal.38exv3t7tju-g.woff2","/_next/static/media/ibm-plex-sans-vietnamese-600-normal.3hxpyk-en1__5.woff2","/_next/static/media/ibm-plex-sans-vietnamese-600-normal.3i-6fz_bx7yta.woff","/_next/static/media/ibm-plex-sans-vietnamese-700-normal.18eestevoqzwv.woff2","/_next/static/media/ibm-plex-sans-vietnamese-700-normal.1_rj7yg1pulj1.woff","/_next/static/SQzSw4JvXNiCNNFDmAXbB/_buildManifest.js","/_next/static/SQzSw4JvXNiCNNFDmAXbB/_clientMiddlewareManifest.js","/_next/static/SQzSw4JvXNiCNNFDmAXbB/_ssgManifest.js"];

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
