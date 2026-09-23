import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBusinessDetailForAdminAction } from "@/lib/actions/admin";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/primitives";
import { formatMoney, formatPercent, UNIT_LABELS } from "@/lib/money";

export default async function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getBusinessDetailForAdminAction(id);
  if (!result.ok) notFound();
  const { business, products, categories, plans } = result.data;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-ink">
        <ArrowLeft className="size-4" /> Back to all businesses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{business.name}</h1>
          <p className="text-sm text-slate mt-1">
            {[business.address, business.city, business.state, business.pincode].filter(Boolean).join(", ") || "No address on file"}
          </p>
          <p className="text-sm text-slate">
            {[business.phone, business.email].filter(Boolean).join(" · ") || "No contact info on file"}
          </p>
          {business.gstin && <p className="text-xs text-slate mt-0.5">GSTIN: {business.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate mb-1">Users</p>
          {business.users.map((u: (typeof business.users)[number]) => (
            <p key={u.id} className="text-sm text-ink-2">
              {u.name} <span className="text-slate">({u.email})</span>{" "}
              <Badge variant={u.role === "OWNER" ? "amber" : "default"}>{u.role}</Badge>
            </p>
          ))}
          {business.trialEndsAt && (
            <p className="text-xs text-slate mt-2">
              Trial ends {new Date(business.trialEndsAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing status</CardTitle>
          <CardDescription>
            Manual, offline billing - flip this when you&apos;ve been paid. No payment gateway is involved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionForm
            businessId={business.id}
            plans={plans}
            requestedPlan={business.requestedPlan ? { id: business.requestedPlan.id, name: business.requestedPlan.name } : null}
            defaultValues={{
              subscriptionStatus: business.subscriptionStatus,
              planId: business.planId ?? "",
              paidUntil: business.paidUntil ? new Date(business.paidUntil).toISOString().slice(0, 10) : "",
              adminNotes: business.adminNotes ?? "",
            }}
          />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categories.length === 0 ? (
              <p className="text-sm text-slate p-5">No categories yet.</p>
            ) : (
              <div className="divide-y divide-paper-line">
                {categories.map((c: (typeof categories)[number]) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="text-ink-2">{c.name}</span>
                    <span className="text-slate tabular">{c._count.products} products</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-sm text-slate p-5">No products yet.</p>
            ) : (
              <div className="divide-y divide-paper-line">
                {products.map((p: (typeof products)[number]) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div>
                      <p className="text-ink-2">{p.name}</p>
                      <p className="text-xs text-slate">
                        {p.category?.name ?? "Uncategorized"} · GST {formatPercent(p.gstRateBasisPoints)}
                      </p>
                    </div>
                    <span className="tabular text-ink font-medium">
                      {formatMoney(p.unitPriceMinor)}
                      <span className="text-xs text-slate font-normal"> /{UNIT_LABELS[p.unit]}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
