import { redirect } from "next/navigation";
import Link from "next/link";
import { IndianRupee, Receipt, Clock, Package, AlertTriangle, ArrowRight } from "lucide-react";
import { getDashboardStatsAction } from "@/lib/actions/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";

export default async function DashboardPage() {
  const result = await getDashboardStatsAction();
  if (!result.ok) redirect("/login");
  const stats = result.data;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Today's Sales" value={formatMoney(stats.todaySalesMinor)} icon={IndianRupee} tone="amber" />
        <StatCard label="Today's Invoices" value={String(stats.todayInvoiceCount)} icon={Receipt} />
        <StatCard
          label="Pending Payments"
          value={formatMoney(stats.pendingPaymentsMinor)}
          icon={Clock}
          tone={stats.pendingPaymentsMinor > 0 ? "brick" : "default"}
        />
        <StatCard label="Products" value={String(stats.productCount)} icon={Package} />
        <StatCard
          label="Low Stock"
          value={String(stats.lowStockCount)}
          icon={AlertTriangle}
          tone={stats.lowStockCount > 0 ? "brick" : "moss"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesTrendChart data={stats.salesTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top-selling products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-slate">No sales yet.</p>
            ) : (
              stats.topProducts.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-slate w-4">{idx + 1}</span>
                    <span className="text-ink-2 truncate">{p.name}</span>
                  </div>
                  <span className="tabular font-medium text-ink shrink-0">{formatMoney(p.totalMinor)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle>Recent invoices</CardTitle>
            <Link href="/invoices" className="text-xs font-medium text-amber-dark hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentInvoices.length === 0 ? (
              <p className="text-sm text-slate p-5">No invoices yet. Create your first bill to see it here.</p>
            ) : (
              <div className="divide-y divide-paper-line">
                {stats.recentInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-paper/60 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink tabular">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate">{inv.customer?.name ?? inv.customerNameSnapshot ?? "Walk-in"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-ink tabular">{formatMoney(inv.grandTotalMinor)}</p>
                      <Badge variant={inv.paymentStatus === "PAID" ? "moss" : "amber"}>
                        {inv.paymentStatus.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate">Everything is well stocked.</p>
            ) : (
              stats.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-2 truncate">{p.name}</span>
                  <span className="tabular font-medium text-brick">{p.stockQty} left</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
