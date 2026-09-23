"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudOff, RefreshCw, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { pendingOutboxCount, syncOutbox } from "@/lib/offline/outbox";
import { isOfflineStorageAvailable } from "@/lib/offline/db";

const RETRY_INTERVAL_MS = 45_000;

export function SyncManager({ businessId }: { businessId: string }) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!isOfflineStorageAvailable()) return;
    setPending(await pendingOutboxCount(businessId));
  }, [businessId]);

  const runSync = useCallback(async () => {
    if (!isOfflineStorageAvailable() || syncing) return;
    setSyncing(true);
    try {
      const { synced, failed } = await syncOutbox(businessId);
      if (synced > 0) {
        toast.success(`Synced ${synced} offline bill${synced === 1 ? "" : "s"}.`);
      }
      if (failed > 0) {
        // Only a genuinely rejected sale (not a connectivity retry) reaches
        // here as "failed" with the connection back up - worth a nudge.
      }
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [businessId, refreshCount, syncing]);

  // Initial check on mount (e.g. bills queued in a previous session).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Sync immediately when the browser regains connectivity.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync-on-reconnect
    if (online) runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Belt-and-suspenders polling: some devices (older Android WebViews
  // especially) don't fire the `online` event reliably.
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) runSync();
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOfflineStorageAvailable()) return null;
  if (online && pending === 0) return null;

  return (
    <div className="no-print fixed bottom-4 right-4 z-40">
      <button
        onClick={runSync}
        disabled={online ? syncing || pending === 0 : true}
        title={online ? "Sync pending bills now" : "Waiting for a connection"}
        className="flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-ink-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {!online ? (
          <>
            <CloudOff className="size-4 text-amber" />
            Offline{pending > 0 ? ` \u2014 ${pending} bill${pending === 1 ? "" : "s"} queued` : ""}
          </>
        ) : syncing ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            Syncing…
          </>
        ) : (
          <>
            <CloudUpload className="size-4 text-amber" />
            {pending} bill{pending === 1 ? "" : "s"} to sync
          </>
        )}
      </button>
    </div>
  );
}
