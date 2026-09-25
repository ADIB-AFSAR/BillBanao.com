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

async function warmRoutes() {
  if (!navigator.onLine) return;
  if (!("serviceWorker" in navigator)) return;

  // Prevent multiple route-warming jobs running at once.
  if (warmingRoutes) return;

  warmingRoutes = true;

  try {
    const registration =
      await navigator.serviceWorker.ready.catch(() => null);

    if (!registration) return;

    for (const route of OFFLINE_ROUTES) {
      if (!navigator.onLine) break;

      try {
        const response = await fetch(route, {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          continue;
        }

        /*
         * Explicitly cache the route HTML.
         *
         * This is necessary because this fetch() is not a browser
         * navigation request, so the service worker's navigation
         * handler does not necessarily cache it for us.
         */
        try {
          const cache = await caches.open("ledger-runtime-v3");

          await cache.put(
            new Request(
              new URL(
                route,
                window.location.origin
              ).toString()
            ),
            response.clone()
          );
        } catch {
          // Cache failure should not prevent asset warming.
        }

        /*
         * Read the HTML after cloning it for Cache Storage.
         */
        const html = await response.text();

        /*
         * Find Next.js static JS/CSS files referenced by this route.
         */
        const assets = Array.from(
          html.matchAll(
            /(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g
          )
        ).map((match) => match[1]);

        const uniqueAssets = [
          ...new Set(assets),
        ];

        /*
         * Fetch assets sequentially so we don't create a huge
         * request burst.
         */
        for (const asset of uniqueAssets) {
          if (!navigator.onLine) break;

          try {
            await fetch(asset, {
              credentials: "same-origin",
              cache: "no-store",
            });
          } catch {
            // One asset failing should not stop the remaining assets.
          }
        }
      } catch {
        // One route failing should not stop the remaining routes.
        continue;
      }
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