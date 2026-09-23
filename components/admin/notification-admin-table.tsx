"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import {
  listNotificationsForAdminAction,
  createNotificationAction,
  updateNotificationAction,
  deleteNotificationAction,
} from "@/lib/actions/admin-notifications";
import { notificationSchema, type NotificationInput } from "@/schemas/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Textarea, Badge } from "@/components/ui/primitives";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
  maxViewsPerBusiness: number | null;
  createdAt: string | Date;
  _count: { views: number };
};

export function NotificationAdminTable() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await listNotificationsForAdminAction();
    if (res.ok) setRows(res.data as unknown as NotificationRow[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteNotificationAction(deleteTarget.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Notification deleted.");
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate">Shown as a dismissible banner across the owner app.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> New notification
        </Button>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Megaphone className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-paper-line">
            {rows.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{n.title}</p>
                    <Badge variant={n.isActive ? "moss" : "default"}>{n.isActive ? "Active" : "Off"}</Badge>
                  </div>
                  <p className="text-sm text-slate mt-0.5">{n.body}</p>
                  <p className="text-xs text-slate mt-1">
                    CTA: &ldquo;{n.ctaLabel}&rdquo; → {n.ctaHref} · Max views:{" "}
                    {n.maxViewsPerBusiness ?? "unlimited"} · Seen by {n._count.views} business
                    {n._count.views === 1 ? "" : "es"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(n);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(n)}>
                    <Trash2 className="size-4 text-brick" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NotificationFormDialog
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
        title="Delete this notification?"
        description="Businesses currently seeing it will stop seeing it immediately."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function NotificationFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: NotificationRow | null;
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
  } = useForm<NotificationInput>({ resolver: zodResolver(notificationSchema) as never });

  useEffect(() => {
    reset({
      title: editing?.title ?? "",
      body: editing?.body ?? "",
      ctaLabel: editing?.ctaLabel ?? "View plans",
      ctaHref: editing?.ctaHref ?? "/plans",
      isActive: editing?.isActive ?? true,
      maxViewsPerBusiness: editing?.maxViewsPerBusiness ?? undefined,
    });
  }, [editing, open, reset]);

  const isActive = watch("isActive");

  async function onSubmit(values: NotificationInput) {
    setLoading(true);
    const result = editing
      ? await updateNotificationAction(editing.id, values)
      : await createNotificationAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Notification updated." : "Notification created.");
    onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit notification" : "New notification"}
      className="sm:max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="n-title">Title</Label>
          <Input id="n-title" invalid={!!errors.title} {...register("title")} placeholder="Limited-time offer" />
          {errors.title && <p className="text-xs text-brick mt-1">{errors.title.message}</p>}
        </div>
        <div>
          <Label htmlFor="n-body">Message</Label>
          <Textarea
            id="n-body"
            rows={2}
            invalid={!!errors.body}
            {...register("body")}
            placeholder="Get 20% off the Standard plan this month."
          />
          {errors.body && <p className="text-xs text-brick mt-1">{errors.body.message}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="n-cta">Button label</Label>
            <Input id="n-cta" {...register("ctaLabel")} />
          </div>
          <div>
            <Label htmlFor="n-href">Button link</Label>
            <Input id="n-href" {...register("ctaHref")} placeholder="/plans" />
          </div>
        </div>
        <div>
          <Label htmlFor="n-maxViews">Max times shown per business</Label>
          <Input id="n-maxViews" type="number" min={1} placeholder="Unlimited until dismissed" {...register("maxViewsPerBusiness")} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
          <input
            type="checkbox"
            className="size-4 accent-amber"
            checked={isActive}
            onChange={(e) => setValue("isActive", e.target.checked)}
          />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
