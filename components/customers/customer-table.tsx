"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2, Users, FileDown, Lock } from "lucide-react";
import { listCustomersAction, deleteCustomerAction } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { OfflineListNotice, OfflineStaleBanner } from "@/components/layout/offline-list-notice";
import { warmCustomerCache, getCachedCustomers } from "@/lib/offline/cache";
import { withTimeout } from "@/lib/offline/with-timeout";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { generateCustomersReportPdf } from "@/lib/reports/generate-customers-pdf";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
};

export function CustomerTable({
  canExportPdf = false,
  businessName = "Business",
  businessId,
}: {
  canExportPdf?: boolean;
  businessName?: string;
  businessId: string;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withTimeout(listCustomersAction(debounced));   
      if (!res.ok) {
      throw new Error(res.error || "Request failed");
    }   
        setCustomers(res.data);
        // Only cache the unfiltered list - a search result is a subset,
        // and caching it would make offline browsing silently show only
        // whoever matched the last search typed before going offline.
        if (!debounced) {
          void warmCustomerCache(
            businessId,
            res.data.map((c) => ({
              id: c.id,
              name: c.name,
              phone: c.phone,
              email: c.email,
              city: c.city,
              state: c.state,
            }))
          );
        }
      setOffline(false);
    } catch {
      // Request never reached the server - fall back to the last cached
      // customer list on this device rather than spinning forever or
      // leaving the page blank.
      const cached = await getCachedCustomers(businessId);
      if (cached.length > 0) setCustomers(cached);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [debounced, businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change
    load();
  }, [load]);

  useEffect(() => {
    // Refetch automatically once the connection comes back.
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteCustomerAction(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    load();
  }

  function handleExportPdf() {
    if (!canExportPdf) {
      toast.error("PDF export is a paid-plan feature. Visit Plans & Billing to upgrade.");
      return;
    }
    if (customers.length === 0) {
      toast.error("No customers to export.");
      return;
    }
    generateCustomersReportPdf(businessName, customers);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate" />
          <Input
            placeholder="Search by name, phone or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleExportPdf}
          title={canExportPdf ? "Export PDF" : "Upgrade to export PDF"}
        >
          {canExportPdf ? <FileDown className="size-4" /> : <Lock className="size-4" />}
          Export PDF
        </Button>
        <Link href="/customers/new">
          <Button className="w-full sm:w-auto">
            <Plus className="size-4" /> Add customer
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading && customers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : offline && customers.length === 0 ? (
          <OfflineListNotice label="Can't reach the server to load customers." onRetry={load} />
        ) : customers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No customers yet.</p>
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
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-paper-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 tabular text-ink-2">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-slate">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link href={`/customers/${c.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="size-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
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
        description="Past invoices for this customer are kept on record."
        confirmLabel="Delete customer"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}