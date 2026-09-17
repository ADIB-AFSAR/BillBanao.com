"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, FileText, Eye, Printer, Copy } from "lucide-react";
import { listInvoicesAction, type InvoiceListParams } from "@/lib/actions/invoices";
import { Input } from "@/components/ui/input";
import { Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRouter } from "next/navigation";

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

export function InvoiceTable() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [status, setStatus] = useState<InvoiceListParams["paymentStatus"] | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listInvoicesAction({
      search: debounced,
      paymentStatus: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    if (res.ok) setInvoices(res.data as unknown as Invoice[]);
    setLoading(false);
  }, [debounced, status, dateFrom, dateTo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change
    load();
  }, [load]);

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
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate">Loading invoices…</div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No invoices found.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
