"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { customerSchema, type CustomerInput } from "@/schemas/common";
import { createCustomerAction, updateCustomerAction } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";

export function CustomerForm({
  customerId,
  defaultValues,
  onSaved,
}: {
  customerId?: string;
  defaultValues?: Partial<CustomerInput>;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema), defaultValues });

  async function onSubmit(values: CustomerInput) {
    setLoading(true);
    const result = customerId
      ? await updateCustomerAction(customerId, values)
      : await createCustomerAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(customerId ? "Customer updated." : "Customer added.");
    if (onSaved) {
      onSaved(result.data.id);
    } else {
      router.push("/customers");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" invalid={!!errors.name} {...register("name")} />
          {errors.name && <p className="text-xs text-brick mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" {...register("phone")} />
        </div>
        <div>
          <Label htmlFor="c-email">Email</Label>
          <Input id="c-email" type="email" {...register("email")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="c-address">Address</Label>
          <Input id="c-address" {...register("address")} />
        </div>
        <div>
          <Label htmlFor="c-city">City</Label>
          <Input id="c-city" {...register("city")} />
        </div>
        <div>
          <Label htmlFor="c-state">State</Label>
          <Input id="c-state" {...register("state")} />
        </div>
        <div>
          <Label htmlFor="c-pincode">Pincode</Label>
          <Input id="c-pincode" {...register("pincode")} />
        </div>
        <div>
          <Label htmlFor="c-gstin">GSTIN (optional)</Label>
          <Input id="c-gstin" invalid={!!errors.gstin} {...register("gstin")} />
          {errors.gstin && <p className="text-xs text-brick mt-1">{errors.gstin.message}</p>}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={loading}>
          {customerId ? "Save changes" : "Add customer"}
        </Button>
      </div>
    </form>
  );
}
