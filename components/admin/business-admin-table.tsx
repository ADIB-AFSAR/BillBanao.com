"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Building2 } from "lucide-react";
import { listBusinessesForAdminAction } from "@/lib/actions/admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/primitives";
import { SUBSCRIPTION_STATUS_LABELS, type SubscriptionStatus } from "@/lib/subscription";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type BusinessRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  createdAt: string | Date;
  ownerEmail: string | null;
  ownerName: string | null;
  subscriptionStatus: SubscriptionStatus;
  displayStatus: SubscriptionStatus;
  paidUntil: string | Date | null;
  planName: string | null;
  requestedPlanName: string | null;
  productCount: number;
  categoryCount: number;
  customerCount: number;
  invoiceCount: number;
};

const STATUS_VARIANT: Record<SubscriptionStatus, "moss" | "amber" | "brick"> = {
  TRIALING: "amber",
  ACTIVE: "moss",
  PAST_DUE: "brick",
  SUSPENDED: "brick",
};

export function BusinessAdminTable() {
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listBusinessesForAdminAction(debounced);
    if (res.ok) setRows(res.data as unknown as BusinessRow[]);
    setLoading(false);
  }, [debounced]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change
    load();
  }, [load]);

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate" />
        <Input
          placeholder="Search business name or owner email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate">Loading businesses…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No businesses registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                  <th className="px-4 py-3 font-medium text-right">Products</th>
                  <th className="px-4 py-3 font-medium text-right">Categories</th>
                  <th className="px-4 py-3 font-medium text-right">Invoices</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-paper-line last:border-0 hover:bg-paper/60 cursor-pointer"
                    onClick={() => (window.location.href = `/admin/businesses/${b.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/businesses/${b.id}`} className="font-medium text-ink hover:underline">
                        {b.name}
                      </Link>
                      <p className="text-xs text-slate">{[b.city, b.state].filter(Boolean).join(", ") || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      <p>{b.ownerName ?? "—"}</p>
                      <p className="text-xs text-slate">{b.ownerEmail ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate tabular">
                      {new Date(b.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3 text-right tabular text-ink-2">{b.productCount}</td>
                    <td className="px-4 py-3 text-right tabular text-ink-2">{b.categoryCount}</td>
                    <td className="px-4 py-3 text-right tabular text-ink-2">{b.invoiceCount}</td>
                    <td className="px-4 py-3 text-slate">
                      {b.planName || "—"}
                      {b.requestedPlanName && (
                        <span className="block text-xs text-amber-dark">wants {b.requestedPlanName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[b.displayStatus]}>
                        {SUBSCRIPTION_STATUS_LABELS[b.displayStatus]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
