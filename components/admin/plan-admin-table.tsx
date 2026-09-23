"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  listPlansForAdminAction,
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
} from "@/lib/actions/admin-plans";
import { planSchema, type PlanInput } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea, Badge } from "@/components/ui/primitives";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";

type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  description: string | null;
  maxCustomers: number | null;
  maxInvoicesPerMonth: number | null;
  maxConcurrentLogins: number | null;
  canExportPdf: boolean;
  isActive: boolean;
  sortOrder: number;
  _count: { currentFor: number; requestedFor: number };
};

function limitDisplay(n: number | null) {
  return n == null ? "Unlimited" : String(n);
}

export function PlanAdminTable() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await listPlansForAdminAction();
    if (res.ok) setPlans(res.data as unknown as Plan[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deletePlanAction(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`"${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate">Owners can only ever pick from these - never free text.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Add plan
        </Button>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : plans.length === 0 ? (
          <div className="p-10 text-center">
            <Sparkles className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No plans yet. Create your first one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Customers</th>
                  <th className="px-4 py-3 font-medium">Invoices/mo</th>
                  <th className="px-4 py-3 font-medium">Logins</th>
                  <th className="px-4 py-3 font-medium">PDF</th>
                  <th className="px-4 py-3 font-medium">On plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-paper-line last:border-0 hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-slate tabular">{p.priceLabel}</p>
                    </td>
                    <td className="px-4 py-3 tabular text-ink-2">{limitDisplay(p.maxCustomers)}</td>
                    <td className="px-4 py-3 tabular text-ink-2">{limitDisplay(p.maxInvoicesPerMonth)}</td>
                    <td className="px-4 py-3 tabular text-ink-2">{limitDisplay(p.maxConcurrentLogins)}</td>
                    <td className="px-4 py-3">{p.canExportPdf ? "Yes" : "—"}</td>
                    <td className="px-4 py-3 tabular text-ink-2">{p._count.currentFor}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isActive ? "moss" : "default"}>{p.isActive ? "Active" : "Retired"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="size-4 text-brick" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Only possible if no business is currently on or requesting it. Consider retiring it instead."
        confirmLabel="Delete plan"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function PlanFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Plan | null;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PlanInput>({ resolver: zodResolver(planSchema) as never });

  useEffect(() => {
    reset({
      name: editing?.name ?? "",
      priceLabel: editing?.priceLabel ?? "",
      description: editing?.description ?? "",
      maxCustomers: editing?.maxCustomers ?? undefined,
      maxInvoicesPerMonth: editing?.maxInvoicesPerMonth ?? undefined,
      maxConcurrentLogins: editing?.maxConcurrentLogins ?? undefined,
      canExportPdf: editing?.canExportPdf ?? false,
      isActive: editing?.isActive ?? true,
      sortOrder: editing?.sortOrder ?? 0,
    });
  }, [editing, open, reset]);

  const canExportPdf = watch("canExportPdf");
  const isActive = watch("isActive");

  async function onSubmit(values: PlanInput) {
    setLoading(true);
    const result = editing ? await updatePlanAction(editing.id, values) : await createPlanAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Plan updated." : "Plan created.");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editing ? "Edit plan" : "Add plan"} className="sm:max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="p-name">Plan name</Label>
            <Input id="p-name" invalid={!!errors.name} {...register("name")} placeholder="Standard" />
            {errors.name && <p className="text-xs text-brick mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="p-price">Price label</Label>
            <Input id="p-price" invalid={!!errors.priceLabel} {...register("priceLabel")} placeholder="₹999/month" />
            {errors.priceLabel && <p className="text-xs text-brick mt-1">{errors.priceLabel.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="p-desc">Description</Label>
          <Textarea id="p-desc" rows={2} {...register("description")} placeholder="Shown to owners on the Plans page" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-paper-line">
          <div>
            <Label htmlFor="p-maxCustomers">Max customers</Label>
            <Input id="p-maxCustomers" type="number" min={0} placeholder="Unlimited" {...register("maxCustomers")} />
          </div>
          <div>
            <Label htmlFor="p-maxInvoices">Max invoices/month</Label>
            <Input id="p-maxInvoices" type="number" min={0} placeholder="Unlimited" {...register("maxInvoicesPerMonth")} />
          </div>
          <div>
            <Label htmlFor="p-maxLogins">Max concurrent logins</Label>
            <Input id="p-maxLogins" type="number" min={0} placeholder="Unlimited" {...register("maxConcurrentLogins")} />
          </div>
        </div>
        <p className="text-xs text-slate -mt-2">Leave any limit blank for unlimited.</p>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-amber"
              checked={canExportPdf}
              onChange={(e) => setValue("canExportPdf", e.target.checked)}
            />
            PDF sales &amp; customer reports
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-amber"
              checked={isActive}
              onChange={(e) => setValue("isActive", e.target.checked)}
            />
            Active (visible to owners)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "Save changes" : "Add plan"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
