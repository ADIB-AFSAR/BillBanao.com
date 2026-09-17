"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { businessSettingsSchema, type BusinessSettingsInput } from "@/schemas/common";
import { updateBusinessSettingsAction } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/primitives";
import { GST_RATE_PRESETS } from "@/lib/money";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 cursor-pointer">
      <span>
        <span className="text-sm font-medium text-ink block">{label}</span>
        {description && <span className="text-xs text-slate">{description}</span>}
      </span>
      <span
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-amber" : "bg-paper-line-2"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </label>
  );
}

export function InvoiceSettingsForm({ defaultValues }: { defaultValues: BusinessSettingsInput }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessSettingsInput>({
    resolver: zodResolver(businessSettingsSchema) as never,
    defaultValues,
  });

  const values = watch();

  async function onSubmit(v: BusinessSettingsInput) {
    setLoading(true);
    const result = await updateBusinessSettingsAction(v);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Invoice settings saved.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="invoicePrefix">Invoice prefix</Label>
          <Input id="invoicePrefix" {...register("invoicePrefix")} />
          {errors.invoicePrefix && <p className="text-xs text-brick mt-1">{errors.invoicePrefix.message}</p>}
        </div>
        <div>
          <Label htmlFor="invoiceNumberPad">Number digits</Label>
          <Input id="invoiceNumberPad" type="number" min={1} max={12} {...register("invoiceNumberPad")} />
          <p className="text-xs text-slate mt-1">e.g. 6 digits → INV-000241</p>
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" {...register("currency")}>
            <option value="INR">₹ INR - Indian Rupee</option>
            <option value="USD">$ USD - US Dollar</option>
            <option value="EUR">€ EUR - Euro</option>
            <option value="GBP">£ GBP - British Pound</option>
          </Select>
        </div>
      </div>

      <div className="divide-y divide-paper-line border-t border-b border-paper-line">
        <Toggle
          label="Enable GST by default on new bills"
          description="Can still be toggled off per-bill at the billing screen."
          checked={values.gstEnabledByDefault}
          onChange={(v) => setValue("gstEnabledByDefault", v)}
        />
        <Toggle
          label="Prices include GST"
          description="Product prices are treated as GST-inclusive rather than added on top."
          checked={values.pricesIncludeGst}
          onChange={(v) => setValue("pricesIncludeGst", v)}
        />
        <Toggle
          label="Allow bill-level discount"
          checked={values.billLevelDiscountEnabled}
          onChange={(v) => setValue("billLevelDiscountEnabled", v)}
        />
        <Toggle
          label="Allow item-level discount"
          checked={values.itemLevelDiscountEnabled}
          onChange={(v) => setValue("itemLevelDiscountEnabled", v)}
        />
        <Toggle
          label="Allow manual price override at billing"
          description="Lets staff edit a product's price while creating a bill."
          checked={values.allowManualPriceOverride}
          onChange={(v) => setValue("allowManualPriceOverride", v)}
        />
      </div>

      <div>
        <Label htmlFor="defaultGstRateBasisPoints">Default GST rate</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {GST_RATE_PRESETS.map((rate) => (
            <button
              type="button"
              key={rate}
              onClick={() => setValue("defaultGstRateBasisPoints", rate * 100)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                values.defaultGstRateBasisPoints === rate * 100
                  ? "bg-ink text-paper border-ink"
                  : "border-paper-line-2 text-ink-2 hover:bg-paper"
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>
        <p className="text-xs text-slate">Applied as the starting GST rate for newly added products.</p>
      </div>

      <div>
        <Label htmlFor="receiptFooter">Receipt footer message</Label>
        <Input id="receiptFooter" {...register("receiptFooter")} placeholder="Thank you for your business!" />
      </div>
      <div>
        <Label htmlFor="termsAndConditions">Terms &amp; conditions</Label>
        <Textarea id="termsAndConditions" rows={3} {...register("termsAndConditions")} />
      </div>

      <Button type="submit" loading={loading}>
        Save invoice settings
      </Button>
    </form>
  );
}
