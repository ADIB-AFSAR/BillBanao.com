"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, FileDown, Users, Receipt, Monitor } from "lucide-react";
import { requestPlanAction } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface PlanRow {
  id: string;
  name: string;
  priceLabel: string;
  description: string | null;
  maxCustomers: number | null;
  maxInvoicesPerMonth: number | null;
  maxConcurrentLogins: number | null;
  canExportPdf: boolean;
}

function limitLabel(n: number | null, unit: string) {
  return n == null ? `Unlimited ${unit}` : `Up to ${n} ${unit}`;
}

export function PlanCards({
  plans,
  currentPlanId,
  requestedPlanId,
}: {
  plans: PlanRow[];
  currentPlanId: string | null;
  requestedPlanId: string | null;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [justRequested, setJustRequested] = useState<string | null>(requestedPlanId);

  async function handleRequest(planId: string) {
    setPendingId(planId);
    const result = await requestPlanAction(planId);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setJustRequested(planId);
    toast.success("Request sent - the platform owner will follow up to activate it.");
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isRequested = plan.id === justRequested && !isCurrent;

        return (
          <Card
            key={plan.id}
            className={cn("flex flex-col", isCurrent && "border-amber ring-1 ring-amber/40")}
          >
            <CardContent className="flex-1 flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-ink">{plan.name}</h3>
                {isCurrent && <Badge variant="amber">Current plan</Badge>}
              </div>
              <p className="text-lg font-bold text-ink mt-1 tabular">{plan.priceLabel}</p>
              {plan.description && <p className="text-sm text-slate mt-2">{plan.description}</p>}

              <ul className="mt-4 space-y-2 text-sm text-ink-2 flex-1">
                <li className="flex items-center gap-2">
                  <Users className="size-4 text-slate shrink-0" />
                  {limitLabel(plan.maxCustomers, "customers")}
                </li>
                <li className="flex items-center gap-2">
                  <Receipt className="size-4 text-slate shrink-0" />
                  {limitLabel(plan.maxInvoicesPerMonth, "invoices/month")}
                </li>
                <li className="flex items-center gap-2">
                  <Monitor className="size-4 text-slate shrink-0" />
                  {limitLabel(plan.maxConcurrentLogins, "logins at once")}
                </li>
                <li className="flex items-center gap-2">
                  {plan.canExportPdf ? (
                    <>
                      <FileDown className="size-4 text-moss shrink-0" />
                      PDF sales &amp; customer reports
                    </>
                  ) : (
                    <>
                      <FileDown className="size-4 text-slate/40 shrink-0" />
                      <span className="text-slate/60">No PDF reports</span>
                    </>
                  )}
                </li>
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="size-4" /> Your current plan
                  </Button>
                ) : isRequested ? (
                  <Button variant="outline" className="w-full" disabled>
                    Requested - awaiting approval
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="amber"
                    loading={pendingId === plan.id}
                    onClick={() => handleRequest(plan.id)}
                  >
                    Request this plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
