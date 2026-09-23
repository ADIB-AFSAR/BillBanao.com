import { getOfflineDb, isOfflineStorageAvailable, type OutboxInvoice } from "./db";
import { createInvoiceAction } from "@/lib/actions/invoices";
import type { CreateInvoiceInput } from "@/schemas/invoice";
import type { ReceiptData } from "@/components/receipt/receipt-view";

/**
 * True for "the request never reached/returned from the server" - the only
 * case we should queue for later. A real server-side rejection (insufficient
 * stock, permission denied, validation error) must NOT be queued, or the
 * person would see a false "saved, will sync" message for a sale that's
 * actually invalid. fetch() rejects (throws) for network failures; a
 * completed request that the server answered, even with an error, resolves
 * normally instead - runAction() always returns {ok:false,...} rather than
 * throwing, so anything that reaches us as a thrown error here is a
 * connectivity failure, not a business-logic rejection.
 */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /fetch|network|failed to fetch/i.test(err.message));
}

function shortId(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Tries to create the invoice normally first. Only if that fails with a
 * network error does it fall back to queueing - so on a good connection
 * this behaves exactly like createInvoiceAction always did.
 */
export async function createInvoiceOnlineOrQueue(
  businessId: string,
  payload: CreateInvoiceInput,
  buildReceiptSnapshot: (clientInvoiceLabel: string) => ReceiptData
): Promise<
  | { mode: "online"; result: Awaited<ReturnType<typeof createInvoiceAction>> }
  | { mode: "queued"; localId: string; receipt: ReceiptData }
> {
  try {
    const result = await createInvoiceAction(payload);
    return { mode: "online", result };
  } catch (err) {
    if (!isNetworkFailure(err) || !isOfflineStorageAvailable()) throw err;

    const localId = crypto.randomUUID();
    const clientInvoiceLabel = `OFFLINE-${shortId()}`;
    const receipt = buildReceiptSnapshot(clientInvoiceLabel);

    const entry: OutboxInvoice = {
      localId,
      createdAt: Date.now(),
      status: "pending",
      attempts: 0,
      clientInvoiceLabel,
      payload: { ...payload, idempotencyKey: localId },
      receiptSnapshot: receipt,
    };

    const db = await getOfflineDb(businessId);
    await db.put("outbox", entry);

    return { mode: "queued", localId, receipt };
  }
}

export async function listOutbox(businessId: string): Promise<OutboxInvoice[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  const all = await db.getAll("outbox");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function pendingOutboxCount(businessId: string): Promise<number> {
  const all = await listOutbox(businessId);
  return all.filter((o) => o.status !== "failed").length;
}

let syncing = false;

/**
 * Processes the outbox strictly one at a time, in the order the bills were
 * made. Sequential on purpose: invoice numbering is assigned by the server
 * at creation time, so syncing in original order keeps invoice numbers in
 * the same order sales actually happened, and avoids ever running two
 * syncs concurrently (which idempotencyKey already protects against, but
 * serial processing avoids relying on that as the only safeguard).
 */
export async function syncOutbox(businessId: string): Promise<{ synced: number; failed: number }> {
  if (syncing || !isOfflineStorageAvailable()) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const db = await getOfflineDb(businessId);
    const items = (await db.getAll("outbox")).sort((a, b) => a.createdAt - b.createdAt);

    for (const item of items) {
      if (item.status === "syncing") continue; // shouldn't happen with the `syncing` guard, but be defensive

      await db.put("outbox", { ...item, status: "syncing" });
      try {
        const result = await createInvoiceAction(item.payload as CreateInvoiceInput);
        if (result.ok) {
          const invoice = result.data as { id: string; invoiceNumber: string };
          await db.put("outbox", {
            ...item,
            status: "syncing",
            syncedInvoiceId: invoice.id,
            syncedInvoiceNumber: invoice.invoiceNumber,
          });
          // Fully synced - remove from the outbox rather than keeping a
          // "synced" tombstone forever; the real invoice now lives in
          // invoice history like any other.
          await db.delete("outbox", item.localId);
          synced++;
        } else {
          // The server actually answered and rejected it (e.g. stock ran
          // out before this device reconnected) - this is not a
          // connectivity problem, so don't keep silently retrying it.
          await db.put("outbox", {
            ...item,
            status: "failed",
            attempts: item.attempts + 1,
            lastError: result.error,
          });
          failed++;
        }
      } catch (err) {
        // Still can't reach the server - leave it pending for the next sync.
        await db.put("outbox", {
          ...item,
          status: "pending",
          attempts: item.attempts + 1,
          lastError: err instanceof Error ? err.message : "Sync failed",
        });
        failed++;
        break; // connection is probably down again - stop this pass, don't burn through retries
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

export async function discardFailedOutboxItem(businessId: string, localId: string): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  await db.delete("outbox", localId);
}

/** Puts a failed item back in the queue to retry (e.g. after the owner restocks). */
export async function retryOutboxItem(businessId: string, localId: string): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const item = await db.get("outbox", localId);
  if (item) await db.put("outbox", { ...item, status: "pending" });
}
