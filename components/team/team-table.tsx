"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Users, ShieldCheck, Power } from "lucide-react";
import {
  listTeamMembersAction,
  inviteStaffAction,
  updateStaffPermissionsAction,
  setStaffActiveAction,
} from "@/lib/actions/team";
import { inviteStaffSchema, type InviteStaffInput } from "@/schemas/team";
import { PERMISSION_LABELS, DEFAULT_STAFF_PERMISSIONS, type StaffPermissions } from "@/lib/permissions-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Badge } from "@/components/ui/primitives";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { OfflineListNotice, OfflineStaleBanner } from "@/components/layout/offline-list-notice";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  isActive: boolean;
} & StaffPermissions;

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof StaffPermissions)[];

export function TeamTable() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<TeamMember | null>(null);
  const [toggling, setToggling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await listTeamMembersAction();
      if (res.ok) setMembers(res.data as unknown as TeamMember[]);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount
    load();
  }, []);

  useEffect(() => {
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, []);

  async function togglePermission(member: TeamMember, key: keyof StaffPermissions) {
    const next = { ...pickPermissions(member), [key]: !member[key] };
    const res = await updateStaffPermissionsAction(member.id, next);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    load();
  }

  async function handleDeactivateConfirm() {
    if (!deactivateTarget) return;
    setToggling(true);
    const res = await setStaffActiveAction(deactivateTarget.id, !deactivateTarget.isActive);
    setToggling(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(deactivateTarget.isActive ? "Access revoked." : "Access restored.");
    setDeactivateTarget(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate max-w-md">
          Invite staff and decide exactly what each of them can see and do. Everyone can always use
          the billing screen.
        </p>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" /> Invite staff
        </Button>
      </div>

      <div className="rounded-lg border border-paper-line bg-paper-raised overflow-hidden">
        {loading && members.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate">Loading…</div>
        ) : offline && members.length === 0 ? (
          <OfflineListNotice label="Can't reach the server to load your team." onRetry={load} />
        ) : members.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="size-8 text-slate/50 mx-auto mb-2" />
            <p className="text-sm text-slate">No team members yet.</p>
          </div>
        ) : (
          <>
            {offline && (
              <div className="p-3 pb-0">
                <OfflineStaleBanner />
              </div>
            )}
          <div className="divide-y divide-paper-line">
            {members.map((m) => (
              <div key={m.id} className="px-4 sm:px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                      {m.role === "OWNER" && (
                        <Badge variant="amber">
                          <ShieldCheck className="size-3 mr-1 inline" /> Owner
                        </Badge>
                      )}
                      {!m.isActive && <Badge variant="brick">Deactivated</Badge>}
                    </div>
                    <p className="text-xs text-slate truncate">{m.email}</p>
                  </div>
                  {m.role === "STAFF" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeactivateTarget(m)}
                      className={m.isActive ? "text-brick" : "text-moss"}
                    >
                      <Power className="size-3.5" />
                      {m.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  )}
                </div>

                {m.role === "STAFF" && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {PERMISSION_KEYS.map((key) => (
                      <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="size-4 mt-0.5 accent-amber shrink-0"
                          checked={m[key]}
                          disabled={!m.isActive}
                          onChange={() => togglePermission(m, key)}
                        />
                        <span>
                          <span className="text-ink-2 font-medium block">{PERMISSION_LABELS[key].label}</span>
                          <span className="text-xs text-slate">{PERMISSION_LABELS[key].description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={() => {
          setInviteOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={deactivateTarget?.isActive ? `Deactivate ${deactivateTarget?.name}?` : `Reactivate ${deactivateTarget?.name}?`}
        description={
          deactivateTarget?.isActive
            ? "They'll be signed out immediately and won't be able to log back in until reactivated. Their past invoices stay on record."
            : "They'll be able to sign in again with their existing password."
        }
        confirmLabel={deactivateTarget?.isActive ? "Deactivate" : "Reactivate"}
        destructive={deactivateTarget?.isActive}
        loading={toggling}
        onConfirm={handleDeactivateConfirm}
      />
    </div>
  );
}

function pickPermissions(member: TeamMember): StaffPermissions {
  return {
    canViewAnalytics: member.canViewAnalytics,
    canManageProducts: member.canManageProducts,
    canManageCustomers: member.canManageCustomers,
    canManageCategories: member.canManageCategories,
    canViewInvoiceHistory: member.canViewInvoiceHistory,
  };
}

function InviteStaffDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvited: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteStaffInput>({ resolver: zodResolver(inviteStaffSchema) as never });

  useEffect(() => {
    reset({ name: "", email: "", password: "", ...DEFAULT_STAFF_PERMISSIONS });
  }, [open, reset]);

  async function onSubmit(values: InviteStaffInput) {
    setLoading(true);
    const result = await inviteStaffAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${values.name} can now sign in.`);
    onInvited();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Invite staff" className="sm:max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" invalid={!!errors.name} {...register("name")} />
            {errors.name && <p className="text-xs text-brick mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" type="email" invalid={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-xs text-brick mt-1">{errors.email.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="s-password">Temporary password</Label>
          <Input id="s-password" type="text" invalid={!!errors.password} {...register("password")} />
          {errors.password && <p className="text-xs text-brick mt-1">{errors.password.message}</p>}
          <p className="text-xs text-slate mt-1">Share this with them directly - there&apos;s no invite email.</p>
        </div>

        <div className="pt-2 border-t border-paper-line">
          <p className="text-sm font-medium text-ink mb-2">What can they do?</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {PERMISSION_KEYS.map((key) => (
              <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 mt-0.5 accent-amber shrink-0"
                  checked={watch(key)}
                  onChange={(e) => setValue(key, e.target.checked)}
                />
                <span>
                  <span className="text-ink-2 font-medium block">{PERMISSION_LABELS[key].label}</span>
                  <span className="text-xs text-slate">{PERMISSION_LABELS[key].description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create login
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
