import { getOfflineDb, isOfflineStorageAvailable, type OutboxInvoice } from "./db";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { withTimeout } from "./with-timeout";
import type { CreateInvoiceInput } from "@/schemas/invoice";
import type { ReceiptData } from "@/components/receipt/receipt-view";

/**
 * True when fetch() itself never got a response - a real connectivity
 * failure between this browser and the server.
 */
function isNetworkFailure(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && /fetch|network|failed to fetch|timed out/i.test(err.message))
  );
}

/**
 * The known, expected business-logic rejections createInvoiceAction (and
 * runAction() itself) can return. These must be shown to the person
 * immediately and never queued, or they'd see a false "saved, will sync"
 * message for a sale that's actually invalid (insufficient stock, no
 * permission, plan limit reached, etc).
 *
 * A response that does NOT match any of these is treated as an
 * infrastructure problem instead: the server was reachable and answered,
 * but couldn't actually do the work - most commonly because it, in turn,
 * couldn't reach its own database. That's just as much a "we're offline
 * from this sale's point of view" situation as fetch() throwing outright,
 * so it gets queued the same way.
 */
const KNOWN_BUSINESS_REJECTIONS = [
  /sign in to do that/i,
  /account's access is currently paused/i,
  /doesn't have permission/i,
  /don't have access to that resource/i,
  /fix the highlighted fields/i,
  /already in use/i,
  /business settings are missing/i,
  /reached your plan's limit/i,
  /could not be found/i,
  /is not currently available for sale/i,
  /insufficient stock/i,
];

function isBusinessRejection(error: string): boolean {
  return KNOWN_BUSINESS_REJECTIONS.some((pattern) => pattern.test(error));
}

function shortId(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Tries to create the invoice normally first. Only if that fails for a
 * connectivity-shaped reason - either the request never reached the
 * server, or it did but the server couldn't actually complete it - does
 * it fall back to queueing. A real business rejection is never queued, so
 * on a good connection this behaves exactly like createInvoiceAction
 * always did.
 */
 export async function createInvoiceOnlineOrQueue(
  businessId: string,
  payload: CreateInvoiceInput,
  buildReceiptSnapshot: (clientInvoiceLabel: string) => ReceiptData
): Promise <
  | { mode: "online"; result: Awaited<ReturnType<typeof createInvoiceAction>> } 
  | { mode: "queued"; localId: string; receipt: ReceiptData }
> {
  const createdAt = Date.now();
  let result: Awaited<ReturnType<typeof createInvoiceAction>> | undefined;
  let caughtError: unknown;

  try {
    // Deliberately generous: createInvoiceAction's own server-side
    // transaction can legitimately take close to 20s under load (see
    // lib/actions/invoices.ts). This must stay well above that, or a slow
    // but working connection would get wrongly queued as offline - which
    // risks creating the same sale twice once the real response lands.
    result = await withTimeout(createInvoiceAction(payload), 25000);
  } catch (err) {
    caughtError = err;
  }

  const shouldQueue =
    caughtError !== undefined
      ? isNetworkFailure(caughtError)
      : result !== undefined && !result.ok && !isBusinessRejection(result.error);

  if (!shouldQueue || !isOfflineStorageAvailable()) {
    if (caughtError !== undefined) throw caughtError;
    return { mode: "online", result: result! };
  }

  {
    const localId = crypto.randomUUID();
    const clientInvoiceLabel = `OFFLINE-${shortId()}`;
    const receipt = buildReceiptSnapshot(clientInvoiceLabel);

    const entry: OutboxInvoice = {
      localId,
      createdAt,
      status: "pending",
      attempts: 0,
      clientInvoiceLabel,
      payload: { ...payload,invoiceDate: new Date(createdAt).toISOString(), idempotencyKey: localId },
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
        const result = await withTimeout(createInvoiceAction(item.payload as CreateInvoiceInput), 25000);
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
        } else if (isBusinessRejection(result.error)) {
          // The server actually answered and rejected it for a real
          // business reason (e.g. stock ran out before this device
          // reconnected) - this is not a connectivity problem, so don't
          // keep silently retrying it.
          await db.put("outbox", {
            ...item,
            status: "failed",
            attempts: item.attempts + 1,
            lastError: result.error,
          });
          failed++;
        } else {
          // The server answered but couldn't do the work for a
          // connectivity-shaped reason (most likely it couldn't reach its
          // own database) - treat this the same as not being able to
          // reach the server at all: leave it pending for the next sync.
          await db.put("outbox", {
            ...item,
            status: "pending",
            attempts: item.attempts + 1,
            lastError: result.error,
          });
          failed++;
          break; // connection is probably still bad - stop this pass, don't burn through retries
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