import { notFound } from "next/navigation";
import { getProductAction } from "@/lib/actions/products";
import { ProductForm } from "@/components/products/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { fromBasisPoints, fromMinorUnits } from "@/lib/money";
import type { UNIT_VALUES } from "@/schemas/common";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProductAction(id);
  if (!result.ok) notFound();
  const product = result.data;

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            productId={product.id}
            defaultValues={{
              name: product.name,
              sku: product.sku ?? "",
              barcode: product.barcode ?? "",
              categoryId: product.categoryId ?? "",
              description: product.description ?? "",
              unitPrice: fromMinorUnits(product.unitPriceMinor),
              costPrice: product.costPriceMinor != null ? fromMinorUnits(product.costPriceMinor) : undefined,
              unit: product.unit as (typeof UNIT_VALUES)[number],
              gstRatePercent: fromBasisPoints(product.gstRateBasisPoints),
              trackStock: product.trackStock,
              stockQty: product.stockQty ?? undefined,
              lowStockThreshold: product.lowStockThreshold ?? undefined,
              isActive: product.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
