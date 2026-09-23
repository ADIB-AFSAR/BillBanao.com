"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudOff, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { listOutbox, syncOutbox, retryOutboxItem, discardFailedOutboxItem } from "@/lib/offline/outbox";
import { isOfflineStorageAvailable, type OutboxInvoice } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import type { ReceiptData } from "@/components/receipt/receipt-view";

export function PendingSyncPanel({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<OutboxInvoice[]>([]);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    if (!isOfflineStorageAvailable()) return;
    setItems(await listOutbox(businessId));
  }, [businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, [load]);

  async function handleSyncNow() {
    setSyncing(true);
    const { synced } = await syncOutbox(businessId);
    setSyncing(false);
    if (synced > 0) toast.success(`Synced ${synced} bill${synced === 1 ? "" : "s"}.`);
    load();
  }

  async function handleRetry(localId: string) {
    await retryOutboxItem(businessId, localId);
    await syncOutbox(businessId);
    load();
  }

  async function handleDiscard(localId: string) {
    await discardFailedOutboxItem(businessId, localId);
    toast.success("Discarded. This sale was not recorded.");
    load();
  }

  if (!isOfflineStorageAvailable() || items.length === 0) return null;

  return (
    <Card className="mb-4 border-amber/40">
      <div className="px-4 sm:px-5 py-3 border-b border-paper-line flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CloudOff className="size-4 text-amber-dark" />
          Bills waiting to sync ({items.length})
        </div>
        <Button variant="outline" size="sm" loading={syncing} onClick={handleSyncNow}>
          <RefreshCw className="size-3.5" /> Sync now
        </Button>
      </div>
      <div className="divide-y divide-paper-line">
        {items.map((item) => {
          const receipt = item.receiptSnapshot as ReceiptData | undefined;
          return (
            <div key={item.localId} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink tabular">{item.clientInvoiceLabel}</p>
                <p className="text-xs text-slate">
                  {receipt?.customerNameSnapshot ?? "Walk-in"} ·{" "}
                  {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {item.status === "failed" && item.lastError && (
                  <p className="flex items-center gap-1 text-xs text-brick mt-0.5">
                    <AlertTriangle className="size-3.5 shrink-0" /> {item.lastError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="tabular font-medium text-ink">
                  {receipt ? formatMoney(receipt.grandTotalMinor) : ""}
                </span>
                {item.status === "failed" ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleRetry(item.localId)}>
                      Retry
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDiscard(item.localId)}>
                      <Trash2 className="size-4 text-brick" />
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-amber-dark font-medium">Waiting…</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
