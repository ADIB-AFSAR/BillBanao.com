"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { subscriptionUpdateSchema, SUBSCRIPTION_STATUS_VALUES, type SubscriptionUpdateInput } from "@/schemas/admin";
import { updateBusinessSubscriptionAction, approveRequestedPlanAction } from "@/lib/actions/admin";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/primitives";

interface PlanOption {
  id: string;
  name: string;
  priceLabel: string;
}

export function SubscriptionForm({
  businessId,
  defaultValues,
  plans,
  requestedPlan,
}: {
  businessId: string;
  defaultValues: SubscriptionUpdateInput;
  plans: PlanOption[];
  requestedPlan: { id: string; name: string } | null;
}) {
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubscriptionUpdateInput>({
    resolver: zodResolver(subscriptionUpdateSchema) as never,
    defaultValues,
  });

  async function onSubmit(values: SubscriptionUpdateInput) {
    setLoading(true);
    const result = await updateBusinessSubscriptionAction(businessId, values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Subscription updated.");
  }

  async function handleApprove() {
    setApproving(true);
    const result = await approveRequestedPlanAction(businessId);
    setApproving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Approved - moved to ${requestedPlan?.name} and marked Active.`);
  }

  return (
    <div className="space-y-4">
      {requestedPlan && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber/40 bg-amber/10 px-4 py-3">
          <p className="text-sm text-ink-2">
            This business requested <span className="font-medium text-ink">{requestedPlan.name}</span>.
          </p>
          <Button size="sm" variant="amber" loading={approving} onClick={handleApprove}>
            Approve request
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subscriptionStatus">Status</Label>
            <Select id="subscriptionStatus" {...register("subscriptionStatus")}>
              {SUBSCRIPTION_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {SUBSCRIPTION_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate mt-1">
              Trialing and Active both let the business use the app. Past due and Suspended block it
              (they&apos;ll see a &ldquo;contact us&rdquo; screen instead of the app).
            </p>
          </div>
          <div>
            <Label htmlFor="planId">Plan</Label>
            <Select id="planId" {...register("planId")}>
              <option value="">No plan assigned</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceLabel}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate mt-1">Always a selection from your Plans list - never free text.</p>
          </div>
          <div>
            <Label htmlFor="paidUntil">Paid through</Label>
            <Input id="paidUntil" type="date" {...register("paidUntil")} />
            <p className="text-xs text-slate mt-1">Just your own record - doesn&apos;t auto-change the status above.</p>
          </div>
        </div>
        <div>
          <Label htmlFor="adminNotes">Private notes (only you see these)</Label>
          <Textarea id="adminNotes" rows={3} {...register("adminNotes")} placeholder="Paid ₹999 via UPI on 12 Jan…" />
          {errors.adminNotes && <p className="text-xs text-brick mt-1">{errors.adminNotes.message}</p>}
        </div>
        <Button type="submit" loading={loading}>
          Save
        </Button>
      </form>
    </div>
  );
}
