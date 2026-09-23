"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { businessProfileSchema, type BusinessProfileInput } from "@/schemas/common";
import { updateBusinessProfileAction } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/primitives";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

export function BusinessProfileForm({
  defaultValues,
  onSaved,
  submitLabel = "Save changes",
}: {
  defaultValues: Partial<BusinessProfileInput>;
  onSaved?: () => void;
  submitLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: BusinessProfileInput) {
    setLoading(true);
    const result = await updateBusinessProfileAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Business details saved.");
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Business name</Label>
          <Input id="name" invalid={!!errors.name} {...register("name")} placeholder="ABC General Store" />
          {errors.name && <p className="text-xs text-brick mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="ownerName">Owner name</Label>
          <Input id="ownerName" {...register("ownerName")} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} placeholder="+91 98765 43210" />
        </div>
        <div>
          <Label htmlFor="email">Business email</Label>
          <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
          {errors.email && <p className="text-xs text-brick mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register("website")} placeholder="https://" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...register("address")} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <select
            id="state"
            {...register("state")}
            className="flex h-10 w-full rounded-md border border-paper-line-2 bg-paper-raised px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40 focus-visible:border-amber"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate mt-1">Used to decide CGST+SGST vs IGST on invoices.</p>
        </div>
        <div>
          <Label htmlFor="pincode">Pincode</Label>
          <Input id="pincode" {...register("pincode")} />
        </div>
        <div>
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input id="gstin" invalid={!!errors.gstin} {...register("gstin")} placeholder="09ABCDE1234F1Z5" />
          {errors.gstin && <p className="text-xs text-brick mt-1">{errors.gstin.message}</p>}
        </div>
      </div>

      <Button type="submit" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
