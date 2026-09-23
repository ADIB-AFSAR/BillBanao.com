"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { adminLoginSchema, type AdminLoginInput } from "@/schemas/admin";
import { loginAdminAction } from "@/lib/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  async function onSubmit(values: AdminLoginInput) {
    setLoading(true);
    const result = await loginAdminAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-ink p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 text-paper mb-6">
          <span className="grid place-items-center size-8 rounded-md bg-amber text-white">
            <ShieldCheck className="size-4" />
          </span>
          <span className="font-semibold">Ledger — Platform Admin</span>
        </div>
        <div className="bg-paper-raised rounded-lg border border-white/10 p-6">
          <h1 className="text-lg font-semibold text-ink">Admin sign in</h1>
          <p className="text-sm text-slate mt-1 mb-5">
            Restricted to platform administrators. This is separate from business logins.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
              {errors.email && <p className="text-xs text-brick mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" invalid={!!errors.password} {...register("password")} />
              {errors.password && <p className="text-xs text-brick mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
