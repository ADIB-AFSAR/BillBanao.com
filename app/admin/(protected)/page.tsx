import { redirect } from "next/navigation";
import { Building2, CheckCircle2, Clock, AlertTriangle, Ban, Sparkles } from "lucide-react";
import { getPlatformStatsAction } from "@/lib/actions/admin";
import { StatCard } from "@/components/dashboard/stat-card";
import { BusinessAdminTable } from "@/components/admin/business-admin-table";

export default async function AdminDashboardPage() {
  const result = await getPlatformStatsAction();
  if (!result.ok) redirect("/admin/login");
  const stats = result.data;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-ink">Businesses</h1>
        <p className="text-sm text-slate mt-1">
          Every business registered on this platform, at a glance. Click one to review its
          products/categories or update its billing status.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard label="Total businesses" value={String(stats.total)} icon={Building2} />
        <StatCard label="Active" value={String(stats.active)} icon={CheckCircle2} tone="moss" />
        <StatCard label="Trialing" value={String(stats.trialing)} icon={Clock} tone="amber" />
        <StatCard label="Past due" value={String(stats.pastDue)} icon={AlertTriangle} tone="brick" />
        <StatCard label="Suspended" value={String(stats.suspended)} icon={Ban} tone="brick" />
        <StatCard
          label="Pending plan requests"
          value={String(stats.pendingRequests)}
          icon={Sparkles}
          tone={stats.pendingRequests > 0 ? "amber" : "default"}
        />
      </div>

      <BusinessAdminTable />
    </div>
  );
}
