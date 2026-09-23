"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { platformSettingsSchema, type PlatformSettingsInput } from "@/schemas/admin";
import { updatePlatformSettingsAction } from "@/lib/actions/admin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";

export function PlatformSettingsForm({ defaultValues }: { defaultValues: PlatformSettingsInput }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlatformSettingsInput>({
    resolver: zodResolver(platformSettingsSchema) as never,
    defaultValues,
  });

  async function onSubmit(values: PlatformSettingsInput) {
    setLoading(true);
    const result = await updatePlatformSettingsAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Platform settings saved.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="trialDurationDays">Free trial length (days)</Label>
        <Input id="trialDurationDays" type="number" min={0} max={365} {...register("trialDurationDays")} />
        {errors.trialDurationDays && (
          <p className="text-xs text-brick mt-1">{errors.trialDurationDays.message}</p>
        )}
        <p className="text-xs text-slate mt-1">
          Applied to every new business at sign-up. Changing this only affects businesses that
          register afterwards - it doesn&apos;t retroactively change anyone already trialing.
        </p>
      </div>
      <Button type="submit" loading={loading}>
        Save
      </Button>
    </form>
  );
}
