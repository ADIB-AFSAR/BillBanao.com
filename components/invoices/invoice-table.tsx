"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, FileText, Eye, Printer, Copy, FileDown, Lock } from "lucide-react";
import { listInvoicesAction, type InvoiceListParams } from "@/lib/actions/invoices";
import { Input } from "@/components/ui/input";
import { Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OfflineListNotice, OfflineStaleBanner } from "@/components/layout/offline-list-notice";
import { warmInvoiceCache, getCachedInvoices } from "@/lib/offline/cache";
import { formatMoney } from "@/lib/money";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRouter } from "next/navigation";
import { generateSalesReportPdf } from "@/lib/reports/generate-sales-pdf";
import { toast } from "sonner";
import { withTimeout } from "@/lib/offline/with-timeout";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  customerNameSnapshot: string | null;
  grandTotalMinor: number;
  paymentStatus: string;
  paymentMethod: string;
  customer: { name: string } | null;
};

const STATUS_VARIANT: Record<string, "moss" | "amber" | "brick"> = {
  PAID: "moss",
  PARTIALLY_PAID: "amber",
  UNPAID: "brick",
};

export function InvoiceTable({
  canExportPdf = false,
  businessName = "Business",
  businessId,
}: {
  canExportPdf?: boolean;
  businessName?: string;
  businessId: string;
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [status, setStatus] = useState<InvoiceListParams["paymentStatus"] | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await withTimeout(
      listInvoicesAction({
        search: debounced,
        paymentStatus: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      ,25000);
      if (!res.ok) {
      throw new Error(res.error || "Request failed");
    }

        const data = res.data as unknown as Invoice[];
        setInvoices(data);
        // Only cache the unfiltered list - a search/status/date filter is a
        // subset, and caching it would make offline browsing silently show
        // only whatever matched the last filter used before going offline.
        if (!debounced && !status && !dateFrom && !dateTo) {
          void warmInvoiceCache(
            businessId,
            data.map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: new Date(inv.invoiceDate).toISOString(),
              customerNameSnapshot: inv.customerNameSnapshot,
              grandTotalMinor: inv.grandTotalMinor,
              paymentStatus: inv.paymentStatus,
              paymentMethod: inv.paymentMethod,
            }))
          );
        }
  
      setOffline(false);
    } catch {
      // Request never reached the server - fall back to the last cached
      // (unfiltered) invoice list on this device rather than spinning
      // forever or leaving the page blank.
      const cached = await getCachedInvoices(businessId);
      if (cached.length > 0) {
        setInvoices(
          cached.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            customerNameSnapshot: inv.customerNameSnapshot,
            grandTotalMinor: inv.grandTotalMinor,
            paymentStatus: inv.paymentStatus,
            paymentMethod: inv.paymentMethod,
            customer: inv.customerNameSnapshot ? { name: inv.customerNameSnapshot } : null,
          }))
        );
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [debounced, status, dateFrom, dateTo, businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change
    load();
  }, [load]);

  useEffect(() => {
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [load]);

  function handleExportPdf() {
    if (!canExportPdf) {
      toast.error("PDF export is a paid-plan feature. Visit Plans & Billing to upgrade.");
      return;
    }
    if (invoices.length === 0) {
      toast.error("Nothing to export for the current filters.");
      return;
    }
    generateSalesReportPdf(
      businessName,
      invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        customerName: inv.customer?.name ?? inv.customerNameSnapshot ?? "Walk-in",
        grandTotalMinor: inv.grandTotalMinor,
        paymentStatus: inv.paymentStatus,
      }))
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate" />
          <Input
            placeholder="Search invoice number or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-44">
          <option value="">All payment status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="UNPAID">Unpaid</option>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="sm:w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="sm:w-40" />
        <Button variant="outline" onClick={handleExportPdf} title={canExportPdf ? "Export PDF" : "Upgrade to export PDF"}>
          {canExportPdf ? <FileDown className="size-4" /> : <Lock className="size-4" />}
          Export PDF
        </Button>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading && invoices.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate">Loading invoices…</div>
        ) : offline && invoices.length === 0 ? (
          <OfflineListNotice label="Can't reach the server to load invoices." onRetry={load} />
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No invoices found.</p>
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
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-paper-line last:border-0 hover:bg-paper/60 cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-ink tabular">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate tabular">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{inv.customer?.name ?? inv.customerNameSnapshot ?? "Walk-in"}</td>
                    <td className="px-4 py-3 text-right tabular font-medium text-ink">
                      {formatMoney(inv.grandTotalMinor)}
                    </td>
                    <td className="px-4 py-3 text-slate">{inv.paymentMethod}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[inv.paymentStatus] ?? "default"}>
                        {inv.paymentStatus.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="icon" aria-label="View">
                            <Eye className="size-4" />
                          </Button>
                        </Link>
                        <Link href={`/invoices/${inv.id}?print=1`}>
                          <Button variant="ghost" size="icon" aria-label="Print">
                            <Printer className="size-4" />
                          </Button>
                        </Link>
                        <Link href={`/billing?duplicate=${inv.id}`}>
                          <Button variant="ghost" size="icon" aria-label="Duplicate">
                            <Copy className="size-4" />
                          </Button>
                        </Link>
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
    </div>
  );
}