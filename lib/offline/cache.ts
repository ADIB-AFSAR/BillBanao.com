import { getOfflineDb, isOfflineStorageAvailable, type CachedProduct, type CachedCustomer, type CachedBusinessInfo } from "./db";

export async function warmProductCache(businessId: string, products: CachedProduct[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("products", "readwrite");
  await tx.store.clear();
  for (const p of products) await tx.store.put(p);
  await tx.done;
}

export async function warmCustomerCache(businessId: string, customers: CachedCustomer[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("customers", "readwrite");
  await tx.store.clear();
  for (const c of customers) await tx.store.put(c);
  await tx.done;
}

export async function saveCachedBusinessInfo(businessId: string, info: CachedBusinessInfo): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  await db.put("meta", info, "business-info");
}

export async function getCachedBusinessInfo(businessId: string): Promise<CachedBusinessInfo | undefined> {
  if (!isOfflineStorageAvailable()) return undefined;
  const db = await getOfflineDb(businessId);
  return db.get("meta", "business-info") as Promise<CachedBusinessInfo | undefined>;
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export async function searchCachedProducts(businessId: string, query: string): Promise<CachedProduct[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  const all = await db.getAll("products");
  return all.filter((p) => matches(query, p.name, p.sku, p.barcode)).slice(0, 20);
}

export async function searchCachedCustomers(businessId: string, query: string): Promise<CachedCustomer[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  const all = await db.getAll("customers");
  return all.filter((c) => matches(query, c.name, c.phone, c.email)).slice(0, 20);
}

/**
 * Best-effort local stock decrement so a second offline sale on the *same
 * device* doesn't oversell against a cache that's gone stale. This is not
 * authoritative - the server re-validates stock for real when the sale
 * syncs, and two different offline devices can still both "sell" the last
 * unit. That's a real, disclosed limitation, not a bug: full cross-device
 * stock locking isn't possible without a live connection.
 */
export async function decrementCachedStock(businessId: string, productId: string, quantity: number): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const product = await db.get("products", productId);
  if (!product || !product.trackStock || product.stockQty == null) return;
  product.stockQty = Math.max(0, product.stockQty - Math.round(quantity));
  await db.put("products", product);
}
