import {
  getOfflineDb,
  isOfflineStorageAvailable,
  type CachedProduct,
  type CachedCustomer,
  type CachedBusinessInfo,
  type CachedCategory,
  type CachedTeamMember,
  type CachedInvoiceSummary,
} from "./db";

export async function warmProductCache(businessId: string, products: CachedProduct[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("products", "readwrite");
  await tx.store.clear();
  for (const p of products) await tx.store.put(p);
  await tx.done;
}

/** Full offline snapshot of products, for the Products list page - not the capped typeahead search used elsewhere. */
export async function getCachedProducts(businessId: string): Promise<CachedProduct[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  return db.getAll("products");
}

export async function warmCustomerCache(businessId: string, customers: CachedCustomer[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("customers", "readwrite");
  await tx.store.clear();
  for (const c of customers) await tx.store.put(c);
  await tx.done;
}

/** Full offline snapshot of customers, for the Customers list page. */
export async function getCachedCustomers(businessId: string): Promise<CachedCustomer[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  return db.getAll("customers");
}

export async function warmCategoryCache(businessId: string, categories: CachedCategory[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("categories", "readwrite");
  await tx.store.clear();
  for (const c of categories) await tx.store.put(c);
  await tx.done;
}

export async function getCachedCategories(businessId: string): Promise<CachedCategory[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  return db.getAll("categories");
}

/** Never pass passwordHash or any other credential-bearing field in here - this is client-side storage. */
export async function warmTeamCache(businessId: string, members: CachedTeamMember[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("teamMembers", "readwrite");
  await tx.store.clear();
  for (const m of members) await tx.store.put(m);
  await tx.done;
}

export async function getCachedTeamMembers(businessId: string): Promise<CachedTeamMember[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  return db.getAll("teamMembers");
}

/**
 * Only call this with an *unfiltered* result set (no search/date/status
 * params) - it fully replaces the cache, and caching a filtered subset
 * would make offline browsing silently show only part of the real list.
 */
export async function warmInvoiceCache(businessId: string, invoices: CachedInvoiceSummary[]): Promise<void> {
  if (!isOfflineStorageAvailable()) return;
  const db = await getOfflineDb(businessId);
  const tx = db.transaction("invoices", "readwrite");
  await tx.store.clear();
  for (const inv of invoices) await tx.store.put(inv);
  await tx.done;
}

export async function getCachedInvoices(businessId: string): Promise<CachedInvoiceSummary[]> {
  if (!isOfflineStorageAvailable()) return [];
  const db = await getOfflineDb(businessId);
  const all = await db.getAll("invoices");
  return all.sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1));
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
