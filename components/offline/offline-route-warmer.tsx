"use client";

import { useEffect } from "react";
import {
  warmProductCache,
  warmCategoryCache,
  warmCustomerCache,
  warmInvoiceCache,
  warmTeamCache,
} from "@/lib/offline/cache";
import { withTimeout } from "@/lib/offline/with-timeout";
import { listProductsAction } from "@/lib/actions/products";
import { listCategoriesAction } from "@/lib/actions/categories";
import { listCustomersAction } from "@/lib/actions/customers";
import { listInvoicesAction } from "@/lib/actions/invoices";
import { listTeamMembersAction } from "@/lib/actions/team";

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
      warmTeamData(businessId),
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

    const run = () => {
      if (cancelled) return;
      if (!navigator.onLine) return;
      void warmRoutes();
      void warmOfflineData(businessId);
    };

    // Initial authenticated load.
    run();

    // Re-warm when the connection comes back.
    window.addEventListener(
      "online",
      run
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "online",
        run
      );
    };
  }, [businessId]);

  return null;
}

type TeamRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  isActive: boolean;
  canViewAnalytics: boolean;
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canManageCategories: boolean;
  canViewInvoiceHistory: boolean;
};

async function warmTeamData(businessId: string) {
  const result = await withTimeout(listTeamMembersAction(), 10000);

  if (!result.ok) {
    throw new Error(result.error || "Failed to load team");
  }

  const members = result.data as unknown as TeamRow[];

  // Only the fields shown in the UI. Never store passwordHash or anything else sensitive.
  await warmTeamCache(
    businessId,
    members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      isActive: m.isActive,
      canViewAnalytics: m.canViewAnalytics,
      canManageProducts: m.canManageProducts,
      canManageCustomers: m.canManageCustomers,
      canManageCategories: m.canManageCategories,
      canViewInvoiceHistory: m.canViewInvoiceHistory,
    }))
  );
}