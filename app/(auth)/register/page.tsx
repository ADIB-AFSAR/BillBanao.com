"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/schemas/common";
import { registerAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setLoading(true);
    const result = await registerAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Account created. Let's set up your business.");
    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
      <p className="text-sm text-slate mt-1 mb-6">Start billing customers in a couple of minutes.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" invalid={!!errors.businessName} {...register("businessName")} placeholder="ABC General Store" />
          {errors.businessName && <p className="text-xs text-brick mt-1">{errors.businessName.message}</p>}
        </div>
        <div>
          <Label htmlFor="ownerName">Your name</Label>
          <Input id="ownerName" invalid={!!errors.ownerName} {...register("ownerName")} />
          {errors.ownerName && <p className="text-xs text-brick mt-1">{errors.ownerName.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-xs text-brick mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-brick mt-1">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="text-sm text-slate mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-ink font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
