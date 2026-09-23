"use client";

import { useEffect, useState } from "react";
import { Search, Plus, ScanBarcode, WifiOff } from "lucide-react";
import { searchProductsForBillingAction } from "@/lib/actions/products";
import { Input } from "@/components/ui/input";
import { formatMoney, UNIT_LABELS } from "@/lib/money";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchCachedProducts } from "@/lib/offline/cache";

export interface BillingProduct {
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

export function ProductSearchPanel({
  businessId,
  onAdd,
}: {
  businessId: string;
  onAdd: (product: BillingProduct) => void;
}) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 150);
  const [results, setResults] = useState<BillingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional debounced search-on-change
    setLoading(true);

    searchProductsForBillingAction(debounced)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setResults(res.data as unknown as BillingProduct[]);
          setFromCache(false);
        }
        setLoading(false);
      })
      .catch(async () => {
        // The request never reached the server (offline/flaky connection) -
        // fall back to whatever was cached the last time we were online.
        if (cancelled) return;
        const cached = await searchCachedProducts(businessId, debounced);
        if (cancelled) return;
        setResults(cached as unknown as BillingProduct[]);
        setFromCache(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, businessId]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate" />
        <Input
          autoFocus
          placeholder="Search by product name, SKU or barcode…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-12 text-base"
        />
        <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate/50" />
      </div>

      {fromCache && (
        <p className="flex items-center gap-1.5 text-xs text-amber-dark mb-2">
          <WifiOff className="size-3.5" /> Showing saved products - prices/stock may be a little out of date.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-paper-line/40 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-slate text-center py-10">No products match your search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {results.map((p) => {
            const outOfStock = p.trackStock && (p.stockQty ?? 0) <= 0;
            return (
              <button
                key={p.id}
                disabled={outOfStock}
                onClick={() => onAdd(p)}
                className="group relative flex flex-col items-start rounded-lg border border-paper-line bg-paper-raised p-3 text-left hover:border-amber hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="absolute top-2 right-2 grid place-items-center size-6 rounded-full bg-ink text-paper opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="size-3.5" />
                </span>
                <p className="text-sm font-medium text-ink pr-6 line-clamp-2">{p.name}</p>
                {p.category && <p className="text-xs text-slate mt-0.5">{p.category.name}</p>}
                <p className="text-sm font-semibold text-ink-2 tabular mt-2">
                  {formatMoney(p.unitPriceMinor)}
                  <span className="text-xs font-normal text-slate"> / {UNIT_LABELS[p.unit]}</span>
                </p>
                {outOfStock && <p className="text-xs text-brick mt-1 font-medium">Out of stock</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
