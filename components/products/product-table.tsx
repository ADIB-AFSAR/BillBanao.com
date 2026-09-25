"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, PackageX } from "lucide-react";
import { listProductsAction, deleteProductAction, type ProductListParams } from "@/lib/actions/products";
import { listCategoriesAction } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Badge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/dialog";
import { OfflineListNotice, OfflineStaleBanner } from "@/components/layout/offline-list-notice";
import { warmProductCache, getCachedProducts, warmCategoryCache, getCachedCategories } from "@/lib/offline/cache";
import { withTimeout } from "@/lib/offline/with-timeout";
import { formatMoney, UNIT_LABELS, formatPercent } from "@/lib/money";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { flattenCategoryTree, indentLabel } from "@/lib/category-tree";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unitPriceMinor: number;
  unit: string;
  gstRateBasisPoints: number;
  trackStock: boolean;
  stockQty: number | null;
  lowStockThreshold: number | null;
  isActive: boolean;
  category: { id: string; name: string } | null;
};

export function ProductTable({ businessId }: { businessId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductListParams["status"]>("all");
  const [sortBy, setSortBy] = useState<ProductListParams["sortBy"]>("name");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withTimeout(
      listProductsAction({
        search: debouncedSearch,
        categoryId: categoryId || undefined,
        status,
        sortBy,
      }),
      25000
    );
    if (!res.ok) throw new Error(res.error || "Request failed");

        setProducts(res.data as unknown as Product[]);
        // Only cache the unfiltered, default-sorted list - caching a
        // filtered subset would make offline browsing silently show only
        // part of the real catalog.
        if (!debouncedSearch && !categoryId && status === "all" && sortBy === "name") {
          void warmProductCache(
            businessId,
            (res.data as unknown as Product[]).map((p) => ({
              id: p.id,
              name: p.name,
              sku: p.sku,
              barcode: p.barcode,
              unitPriceMinor: p.unitPriceMinor,
              unit: p.unit,
              gstRateBasisPoints: p.gstRateBasisPoints,
              trackStock: p.trackStock,
              stockQty: p.stockQty,
              category: p.category ? { name: p.category.name } : null,
            }))
          );

      }
      setOffline(false);
    } catch {
      // The request never reached the server (no connection). Fall back to
      // whatever was last cached on this device rather than spinning
      // forever or leaving the page blank - it won't reflect any filters,
      // but it's real data instead of nothing.
      const cached = await getCachedProducts(businessId);
      if (cached.length > 0) {
        setProducts(
          cached.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            unitPriceMinor: p.unitPriceMinor,
            unit: p.unit,
            gstRateBasisPoints: p.gstRateBasisPoints,
            trackStock: p.trackStock,
            stockQty: p.stockQty,
            lowStockThreshold: null,
            isActive: true,
            category: p.category ? { id: "", name: p.category.name } : null,
          }))
        );
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId, status, sortBy, businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change
    load();
  }, [load]);

  useEffect(() => {
    // Refetch automatically the moment the connection comes back, so the
    // list doesn't stay stale until the person happens to change a filter.
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [load]);

  useEffect(() => {
    withTimeout(listCategoriesAction(),25000)
      .then((res) => {
        if (!res.ok) {
      throw new Error(res.error || "Request failed");
    }
          setCategories(res.data);
          void warmCategoryCache(
            businessId,
            res.data.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              parentId: c.parentId,
              productCount: c._count.products,
              childrenCount: c._count.children,
            }))
          );
      })
      .catch(async () => {
        // Fall back to the last cached category list for the filter
        // dropdown - the main product list's own load() above handles its
        // own offline state independently.
        const cached = await getCachedCategories(businessId);
        setCategories(cached.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })));
      });
  }, [businessId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteProductAction(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    load();
  }

  const lowStockIds = useMemo(
    () =>
      new Set(
        products
          .filter((p) => p.trackStock && p.stockQty != null && p.lowStockThreshold != null && p.stockQty <= p.lowStockThreshold)
          .map((p) => p.id)
      ),
    [products]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate" />
          <Input
            placeholder="Search by name, SKU or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="sm:w-44">
          <option value="">All categories</option>
          {flattenCategoryTree(categories).map(({ category: c, depth }) => (
            <option key={c.id} value={c.id}>
              {indentLabel(c.name, depth)}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ProductListParams["status"])} className="sm:w-36">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as ProductListParams["sortBy"])} className="sm:w-40">
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
          <option value="stock">Sort: Stock</option>
          <option value="updated">Sort: Updated</option>
        </Select>
        <Link href="/products/new">
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" /> Add product
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading && products.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate">Loading products…</div>
        ) : offline && products.length === 0 ? (
          <OfflineListNotice label="Can't reach the server to load products." onRetry={load} />
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <PackageX className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No products found. Add your first product to get started.</p>
          </div>
        ) : (
          <>
            {offline && (
              <div className="p-3 pb-0">
                <OfflineStaleBanner />
              </div>
            )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium">GST</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-paper-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-slate tabular">{p.sku || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">
                      {formatMoney(p.unitPriceMinor)} / {UNIT_LABELS[p.unit]}
                    </td>
                    <td className="px-4 py-3 text-slate tabular">{formatPercent(p.gstRateBasisPoints)}</td>
                    <td className="px-4 py-3">
                      {p.trackStock ? (
                        <span className={`tabular ${lowStockIds.has(p.id) ? "text-brick font-medium" : "text-ink-2"}`}>
                          {p.stockQty}
                        </span>
                      ) : (
                        <span className="text-slate">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isActive ? "moss" : "default"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`/products/${p.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`}>
                            <Pencil className="size-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${p.name}`}
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="size-4 text-brick" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This can't be undone. Past invoices that used this product keep their own record and won't be affected."
        confirmLabel="Delete product"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}