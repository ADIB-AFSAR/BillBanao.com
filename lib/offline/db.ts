import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface CachedProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unitPriceMinor: number;
  unit: string;
  gstRateBasisPoints: number;
  trackStock: boolean;
  stockQty: number | null;
  category: { name: string } | null;
}

export interface CachedCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  state: string | null;
}

/** Everything a receipt needs to render fully offline, with no further lookups. */
export interface CachedBusinessInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  logoUrl: string | null;
  state: string | null;
  currency: string;
  receiptFooter: string | null;
  termsAndConditions: string | null;
}

export interface OutboxInvoice {
  localId: string; // also used as the idempotency key sent to the server
  createdAt: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
  attempts: number;
  clientInvoiceLabel: string; // e.g. "OFFLINE-4F2A" - shown until the real number is assigned
  payload: unknown; // the exact CreateInvoiceInput sent to createInvoiceAction
  receiptSnapshot: unknown; // pre-rendered ReceiptData so the receipt looks identical before/after sync
  syncedInvoiceId?: string; // set once the server confirms - lets the UI link to the real invoice
  syncedInvoiceNumber?: string;
}

interface OfflineSchema extends DBSchema {
  products: { key: string; value: CachedProduct };
  customers: { key: string; value: CachedCustomer };
  outbox: { key: string; value: OutboxInvoice; indexes: { "by-status": string } };
  meta: { key: string; value: unknown };
}

const DB_VERSION = 1;
let dbPromise: Promise<IDBPDatabase<OfflineSchema>> | null = null;
let openBusinessId: string | null = null;

/**
 * Opens (or reuses) the IndexedDB connection for one business. Scoping the
 * database name by businessId means a shared device that's used to sign
 * into a different business later never reads stale/foreign data - it just
 * opens a different, empty database.
 */
export function getOfflineDb(businessId: string): Promise<IDBPDatabase<OfflineSchema>> {
  if (dbPromise && openBusinessId === businessId) return dbPromise;
  openBusinessId = businessId;
  dbPromise = openDB<OfflineSchema>(`ledger-offline-${businessId}`, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
      if (!db.objectStoreNames.contains("customers")) db.createObjectStore("customers", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("outbox")) {
        const store = db.createObjectStore("outbox", { keyPath: "localId" });
        store.createIndex("by-status", "status");
      }
    },
  });
  return dbPromise;
}

/** True if IndexedDB is usable at all (SSR, privacy modes, and old browsers can lack it). */
export function isOfflineStorageAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}
