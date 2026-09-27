"use client";

import { useEffect } from "react";

const CHUNK_ERROR_PATTERN =
  /loading chunk|chunkloaderror|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i;

const RELOAD_GUARD_KEY = "ledger-chunk-reload-guard";
const RELOAD_GUARD_WINDOW_MS = 10_000;

export function isChunkLoadError(message: string | null | undefined): boolean {
  return !!message && CHUNK_ERROR_PATTERN.test(message);
}

/**
 * Reloads the page, but at most once per RELOAD_GUARD_WINDOW_MS. Without
 * this guard, a chunk that's genuinely never going to load (nothing
 * cached, no connection) would reload-loop forever instead of eventually
 * showing a real error.
 */
export function reloadToRecoverChunk(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode, etc.) - reload anyway;
    // worst case is one extra reload instead of a guaranteed one.
  }
  window.location.reload();
}

/**
 * A JS chunk the app needs - for the page just clicked into, or a lazily
 * loaded piece of an already-open page - can fail to load, most often
 * because it was never cached while online and the connection is gone
 * now. That's not something React's error-boundary reset() can fix: the
 * browser's module loader already gave up on that exact network request,
 * and re-rendering the same component tree just asks for the same missing
 * module again. A real reload is the only thing that goes back through
 * the service worker for another chance at serving whatever WAS cached -
 * which is also exactly what "Try again" should do for this kind of
 * error (see components/layout/error-fallback.tsx).
 */
export function ChunkErrorRecovery() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (isChunkLoadError(event.message)) reloadToRecoverChunk();
    }
    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      if (isChunkLoadError(message)) reloadToRecoverChunk();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
