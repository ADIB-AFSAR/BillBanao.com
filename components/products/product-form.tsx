"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { productSchema, UNIT_VALUES, type ProductInput } from "@/schemas/common";
import { createProductAction, updateProductAction } from "@/lib/actions/products";
import { listCategoriesAction } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Select, Textarea } from "@/components/ui/primitives";
import { UNIT_LABELS, GST_RATE_PRESETS } from "@/lib/money";

interface CategoryOption {
  id: string;
  name: string;
}

export function ProductForm({
  productId,
  defaultValues,
}: {
  productId?: string;
  defaultValues?: Partial<ProductInput>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductInput>({
    // zod's `coerce` fields make the resolver's input/output types diverge
    // slightly from react-hook-form's expected shape; the runtime behavior
    // (parse-then-validate) is correct, so this cast is safe.
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      unit: "PIECE",
      gstRatePercent: 0,
      trackStock: false,
      isActive: true,
      ...defaultValues,
    },
  });

  useEffect(() => {
    listCategoriesAction().then((res) => {
      if (res.ok) setCategories(res.data);
    });
  }, []);

  const trackStock = watch("trackStock");
  const gstRatePercent = watch("gstRatePercent");

  async function onSubmit(values: ProductInput) {
    setLoading(true);
    const result = productId
      ? await updateProductAction(productId, values)
      : await createProductAction(values);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(productId ? "Product updated." : "Product added.");
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Product name</Label>
          <Input id="name" invalid={!!errors.name} {...register("name")} placeholder="Basmati Rice" />
          {errors.name && <p className="text-xs text-brick mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" {...register("sku")} placeholder="RICE-1KG" />
        </div>
        <div>
          <Label htmlFor="barcode">Barcode</Label>
          <Input id="barcode" {...register("barcode")} />
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" {...register("categoryId")}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Select id="unit" {...register("unit")}>
            {UNIT_VALUES.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} {...register("description")} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-paper-line">
        <div>
          <Label htmlFor="unitPrice">Selling price</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min={0}
            invalid={!!errors.unitPrice}
            {...register("unitPrice")}
          />
          {errors.unitPrice && <p className="text-xs text-brick mt-1">{errors.unitPrice.message}</p>}
        </div>
        <div>
          <Label htmlFor="costPrice">Cost price (optional)</Label>
          <Input id="costPrice" type="number" step="0.01" min={0} {...register("costPrice")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="gstRatePercent">GST rate</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {GST_RATE_PRESETS.map((rate) => (
              <button
                type="button"
                key={rate}
                onClick={() => setValue("gstRatePercent", rate)}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  Number(gstRatePercent) === rate
                    ? "bg-ink text-paper border-ink"
                    : "border-paper-line-2 text-ink-2 hover:bg-paper"
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
          <Input
            id="gstRatePercent"
            type="number"
            step="0.01"
            min={0}
            max={100}
            invalid={!!errors.gstRatePercent}
            {...register("gstRatePercent")}
          />
          {errors.gstRatePercent && <p className="text-xs text-brick mt-1">{errors.gstRatePercent.message}</p>}
        </div>
      </div>

      <div className="pt-2 border-t border-paper-line">
        <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
          <input type="checkbox" className="size-4 accent-amber" {...register("trackStock")} />
          Track stock for this product
        </label>
        {trackStock && (
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <div>
              <Label htmlFor="stockQty">Current stock</Label>
              <Input id="stockQty" type="number" step="1" {...register("stockQty")} />
            </div>
            <div>
              <Label htmlFor="lowStockThreshold">Low-stock alert threshold</Label>
              <Input id="lowStockThreshold" type="number" step="1" {...register("lowStockThreshold")} />
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
        <input type="checkbox" className="size-4 accent-amber" defaultChecked {...register("isActive")} />
        Active (visible for sale on the billing screen)
      </label>

      <div className="flex gap-2 pt-2">
        <Button type="submit" loading={loading}>
          {productId ? "Save changes" : "Add product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
