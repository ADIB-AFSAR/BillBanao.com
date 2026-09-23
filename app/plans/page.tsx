import { redirect } from "next/navigation";
import { AlertTriangle, Clock } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getPlansPageDataAction } from "@/lib/actions/plans";
import { PlanCards } from "@/components/plans/plan-cards";
import { Card, CardContent, Badge } from "@/components/ui/primitives";
import { DataUnavailable } from "@/components/layout/data-unavailable";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/subscription";

export default async function PlansPage() {
  // app/plans/layout.tsx already guarantees a valid session before this
  // page runs, same as billing/page.tsx.
  const session = await getSession();
  if (!session) redirect("/login");

  const result = await getPlansPageDataAction();
  if (!result.ok) {
    return <DataUnavailable message="Couldn't load plan and billing info right now." retryHref="/plans" />;
  }
  const { currentPlan, requestedPlan, status, trialEndsAt, plans, usage } = result.data;

  const statusVariant = status === "ACTIVE" || status === "TRIALING" ? "moss" : "brick";

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Plans &amp; billing</h1>
        <p className="text-sm text-slate mt-1">
          Billing here is handled directly by the platform owner - pick a plan below and they&apos;ll
          follow up to activate it.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate mb-1">Status</p>
            <Badge variant={statusVariant}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate mb-1">Current plan</p>
            <p className="text-sm font-medium text-ink">{currentPlan?.name ?? "No plan assigned"}</p>
          </div>
          {status === "TRIALING" && trialEndsAt && (
            <div>
              <p className="text-xs uppercase tracking-wide text-slate mb-1 flex items-center gap-1">
                <Clock className="size-3.5" /> Trial ends
              </p>
              <p className="text-sm font-medium text-ink">
                {new Date(trialEndsAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              </p>
            </div>
          )}
          {requestedPlan && (
            <div>
              <p className="text-xs uppercase tracking-wide text-slate mb-1 flex items-center gap-1">
                <AlertTriangle className="size-3.5" /> Pending request
              </p>
              <p className="text-sm font-medium text-ink">{requestedPlan.name}</p>
            </div>
          )}
          <div className="ml-auto flex gap-6 text-sm">
            <div>
              <p className="text-slate text-xs">Customers</p>
              <p className="font-medium text-ink tabular">
                {usage.customerCount}
                {currentPlan?.maxCustomers != null && <span className="text-slate"> / {currentPlan.maxCustomers}</span>}
              </p>
            </div>
            <div>
              <p className="text-slate text-xs">Invoices this month</p>
              <p className="font-medium text-ink tabular">
                {usage.invoicesThisMonth}
                {currentPlan?.maxInvoicesPerMonth != null && (
                  <span className="text-slate"> / {currentPlan.maxInvoicesPerMonth}</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {plans.length === 0 ? (
        <p className="text-sm text-slate">No plans have been published yet - check back soon.</p>
      ) : (
        <PlanCards
          plans={plans}
          currentPlanId={currentPlan?.id ?? null}
          requestedPlanId={requestedPlan?.id ?? null}
        />
      )}
    </div>
  );
}
