"use client";

import { WifiOff } from "lucide-react";

/**
 * Shown inside a data table/list area when its fetch couldn't reach the
 * server at all (offline, DNS failure, etc - the promise rejected rather
 * than resolving to {ok:false}). Distinct from an empty-state ("no
 * products yet") - this means we don't actually know what's there.
 */
export function OfflineListNotice({
  onRetry,
  label = "Can't reach the server right now.",
}: {
  onRetry: () => void;
  label?: string;
}) {
  return (
    <div className="p-10 text-center">
      <WifiOff className="size-6 text-amber-dark mx-auto mb-3" />
      <p className="text-sm text-slate mb-4">{label}</p>
      <button
        type="button"
        onClick={onRetry}
        className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-ink-2"
      >
        Try again
      </button>
    </div>
  );
}

/** Small non-blocking banner shown above a list that's showing stale/last-loaded data while offline. */
export function OfflineStaleBanner() {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber-dark">
      <WifiOff className="size-3.5 shrink-0" />
      You&apos;re offline — showing the last loaded list. It&apos;ll refresh automatically once you&apos;re back online.
    </div>
  );
}
