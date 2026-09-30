"use client";

import { useEffect } from "react";
import {
  warmProductCache,
  warmCategoryCache,
  warmCustomerCache,
  warmInvoiceCache,
} from "@/lib/offline/cache";
import { withTimeout } from "@/lib/offline/with-timeout";
import { listProductsAction } from "@/lib/actions/products";
import { listCategoriesAction } from "@/lib/actions/categories";
import { listCustomersAction } from "@/lib/actions/customers";
import { listInvoicesAction } from "@/lib/actions/invoices";

const OFFLINE_ROUTES = [
  "/dashboard",
  "/billing",
  "/invoices",
  "/customers",
  "/products",
  "/categories",
  "/team",
  "/settings",
  "/plans",
];

let warmingRoutes = false;
let warmingData = false;

/**
 * Asks the service worker to fetch and cache each route's real page HTML.
 *
 * All the JS/CSS a page needs is already precached at service-worker
 * install time (see public/sw.template.js + scripts/generate-sw.mjs), so
 * all that's left is each route's own server-rendered HTML - which,
 * unlike the JS bundle, genuinely differs per business (it embeds this
 * business's data) and so can't be baked in at build time.
 *
 * The actual cache.put happens inside the service worker (see the
 * WARM_ROUTE message handler in sw.template.js), not here. That keeps the
 * current cache name known in exactly one place - the worker itself -
 * instead of this file having to hardcode a name that changes on every
 * build.
 */
async function warmRoutes() {
  if (!navigator.onLine) return;
  if (!("serviceWorker" in navigator)) return;
  if (warmingRoutes) return;

  warmingRoutes = true;
  try {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const worker = registration?.active;
    if (!worker) return;

    for (const route of OFFLINE_ROUTES) {
      if (!navigator.onLine) break;
      worker.postMessage({ type: "WARM_ROUTE", url: route });
      // Stagger slightly so this doesn't fire nine fetches in the same tick.
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } finally {
    warmingRoutes = false;
  }
}

async function warmProductData(
  businessId: string
) {
  const result = await withTimeout(
    listProductsAction({
      search: "",
      categoryId: undefined,
      status: "all",
      sortBy: "name",
    }),
    10000
  );

  if (!result.ok) {
    throw new Error(
      result.error || "Failed to load products"
    );
  }

  await warmProductCache(
    businessId,
    result.data
  );
}

async function warmCategoryData(
  businessId: string
) {
  const result = await withTimeout(
    listCategoriesAction(),
    10000
  );

  if (!result.ok) {
    throw new Error(
      result.error || "Failed to load categories"
    );
  }

  const categories = result.data.map(
    (category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      productCount:
        category._count.products,
      childrenCount:
        category._count.children,
    })
  );

  await warmCategoryCache(
    businessId,
    categories
  );
}

async function warmCustomerData(
  businessId: string
) {
  const result = await withTimeout(
    listCustomersAction(""),
    10000
  );

  if (!result.ok) {
    throw new Error(
      result.error || "Failed to load customers"
    );
  }

  await warmCustomerCache(
    businessId,
    result.data
  );
}

async function warmInvoiceData(
  businessId: string
) {
  const result = await withTimeout(
    listInvoicesAction({
      search: "",
    }),
    10000
  );

  if (!result.ok) {
    throw new Error(
      result.error || "Failed to load invoices"
    );
  }

  const invoices = result.data.map(
    (invoice) => ({
      id: invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      invoiceDate:
        new Date(
          invoice.invoiceDate
        ).toISOString(),
      customerNameSnapshot:
        invoice.customerNameSnapshot,
      grandTotalMinor:
        invoice.grandTotalMinor,
      paymentStatus:
        String(invoice.paymentStatus),
      paymentMethod:
        String(invoice.paymentMethod),
    })
  );

  await warmInvoiceCache(
    businessId,
    invoices
  );
}

async function warmOfflineData(
  businessId: string
) {
  if (!navigator.onLine) return;

  if (warmingData) return;

  warmingData = true;

  try {
    await Promise.allSettled([
      warmProductData(businessId),
      warmCategoryData(businessId),
      warmCustomerData(businessId),
      warmInvoiceData(businessId),
    ]);
  } finally {
    warmingData = false;
  }
}

export function OfflineRouteWarmer({
  businessId,
}: {
  businessId: string;
}) {
    useEffect(() => {
    let cancelled = false;
    const KEY = `ledger-last-warm-${businessId}`;
    const MIN_GAP_MS = 30 * 60 * 1000; // at most every 30 min on launch

    const run = (force: boolean) => {
      if (cancelled || !navigator.onLine) return;
      if (!force) {
        const last = Number(localStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < MIN_GAP_MS) return;
      }
      localStorage.setItem(KEY, String(Date.now()));
      void warmRoutes();
      void warmOfflineData(businessId);
    };

    // Wait until the app is usable before doing background work.
    const timer = setTimeout(() => run(false), 10000);
    const onOnline = () => run(true); // coming back online: always refresh
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [businessId]);

  return null;
}