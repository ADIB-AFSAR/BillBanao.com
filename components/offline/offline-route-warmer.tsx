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

async function warmRoutes() {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return;

  for (const route of OFFLINE_ROUTES) {
    try {
      const response = await fetch(route, {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Find Next.js static JS/CSS files referenced by this route.
      const assets = Array.from(
        html.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g)
      ).map((match) => match[1]);

      // Remove duplicates.
      const uniqueAssets = [...new Set(assets)];

      // Fetch them while online so the service worker caches them.
      await Promise.allSettled(
        uniqueAssets.map((asset) =>
          fetch(asset, {
            credentials: "same-origin",
            cache: "no-store",
          })
        )
      );
    } catch {
      // One route failing should not stop the remaining routes.
      continue;
    }
  }
}

async function warmProductData(businessId: string) {
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
    throw new Error(result.error || "Failed to load products");
  }

  await warmProductCache(businessId, result.data);
}

async function warmCategoryData(businessId: string) {
  const result = await withTimeout(
    listCategoriesAction(),
    10000
  );

  if (!result.ok) {
    throw new Error(result.error || "Failed to load categories");
  }

  const categories = result.data.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    parentId: category.parentId,
    productCount: category._count.products,
    childrenCount: category._count.children,
  }));

  await warmCategoryCache(businessId, categories);
}

async function warmCustomerData(businessId: string) {
  const result = await withTimeout(
    listCustomersAction(""),
    10000
  );

  if (!result.ok) {
    throw new Error(result.error || "Failed to load customers");
  }

  await warmCustomerCache(businessId, result.data);
}

async function warmInvoiceData(businessId: string) {
  const result = await withTimeout(
    listInvoicesAction({
      search: "",
    }),
    10000
  );

  if (!result.ok) {
    throw new Error(result.error || "Failed to load invoices");
  }

  const invoices = result.data.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: new Date(invoice.invoiceDate).toISOString(),
    customerNameSnapshot: invoice.customerNameSnapshot,
    grandTotalMinor: invoice.grandTotalMinor,
    paymentStatus: String(invoice.paymentStatus),
    paymentMethod: String(invoice.paymentMethod),
  }));

  await warmInvoiceCache(businessId, invoices);
}

async function warmOfflineData(businessId: string) {
  if (!navigator.onLine) return;

  await Promise.allSettled([
    warmProductData(businessId),
    warmCategoryData(businessId),
    warmCustomerData(businessId),
    warmInvoiceData(businessId),
  ]);
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

      void warmRoutes();
      void warmOfflineData(businessId);
    };

    // Initial authenticated load
    run();

    // Re-warm whenever connection comes back
    window.addEventListener("online", run);

    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
    };
  }, [businessId]);

  return null;
}