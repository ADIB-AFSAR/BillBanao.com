"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, X, WifiOff } from "lucide-react";
import { listCustomersAction } from "@/lib/actions/customers";
import { Dialog } from "@/components/ui/dialog";
import { CustomerForm } from "@/components/customers/customer-form";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { searchCachedCustomers } from "@/lib/offline/cache";
import { withTimeout } from "@/lib/offline/with-timeout";

export interface BillingCustomer {
  id: string;
  name: string;
  phone: string | null;
  state: string | null;
}

export function CustomerPicker({
  businessId,
  selected,
  onSelect,
}: {
  businessId: string;
  selected: BillingCustomer | null;
  onSelect: (customer: BillingCustomer | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 200);
  const [results, setResults] = useState<BillingCustomer[]>([]);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    withTimeout(listCustomersAction(debounced), 4000)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(res.error || "Request failed");
        }
          setResults(res.data);
          setFromCache(false);
        
      })
      .catch(async () => {
        if (cancelled) return;
        const cached = await searchCachedCustomers(businessId, debounced);
        if (cancelled) return;
        setResults(cached);
        setFromCache(true);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, open, businessId]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-paper-line-2 bg-paper px-3 py-2">
        <div>
          <p className="text-sm font-medium text-ink">{selected.name}</p>
          {selected.phone && <p className="text-xs text-slate tabular">{selected.phone}</p>}
        </div>
        <button
          onClick={() => onSelect(null)}
          className="text-slate hover:text-ink p-1"
          aria-label="Clear customer, bill as walk-in"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 rounded-md border border-dashed border-paper-line-2 px-3 py-2 text-sm text-slate hover:border-amber hover:text-ink"
      >
        <Search className="size-4" />
        Walk-in Customer — search or add
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-md border border-paper-line bg-paper-raised shadow-lg max-h-72 overflow-y-auto">
            <div className="p-2 border-b border-paper-line">
              <Input
                autoFocus
                placeholder="Search customers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {fromCache && (
                <p className="flex items-center gap-1.5 text-xs text-amber-dark mt-1.5">
                  <WifiOff className="size-3.5" /> Showing saved customers.
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setAddOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-amber-dark hover:bg-amber/10 border-b border-paper-line"
            >
              <UserPlus className="size-4" /> Add new customer
            </button>
            {results.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate text-center">No customers found.</p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-paper border-b border-paper-line last:border-0"
                >
                  <p className="font-medium text-ink">{c.name}</p>
                  {c.phone && <p className="text-xs text-slate tabular">{c.phone}</p>}
                </button>
              ))
            )}
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen} title="Add customer">
        <CustomerForm
          onSaved={(id) => {
            setAddOpen(false);
            listCustomersAction("").then((res) => {
              if (res.ok) {
                const created = res.data.find((c: BillingCustomer) => c.id === id);
                if (created) onSelect(created);
              }
            });
          }}
        />
      </Dialog>
    </div>
  );
}
