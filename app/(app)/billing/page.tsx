import { redirect } from "next/navigation";
import { getBusinessAction } from "@/lib/actions/business";
import { getInvoiceAction } from "@/lib/actions/invoices";
import { prisma } from "@/lib/db";
import { BillingScreen } from "@/components/billing/billing-screen";
import type { CartItem } from "@/components/billing/billing-screen";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  const result = await getBusinessAction();
  if (!result.ok) redirect("/login");
  const business = result.data;
  if (!business.settings) redirect("/business/setup");

  const { duplicate } = await searchParams;
  let prefillItems: CartItem[] | undefined;

  if (duplicate) {
    const invoiceResult = await getInvoiceAction(duplicate);
    if (invoiceResult.ok) {
      const items = invoiceResult.data.items as Array<{ productId: string | null; quantityMilli: number }>;
      const productIds: string[] = items.map((i) => i.productId).filter((id): id is string => !!id);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map<string, (typeof products)[number]>(
        products.map((p: (typeof products)[number]) => [p.id, p])
      );

      prefillItems = items
        .filter((item) => item.productId && productMap.has(item.productId))
        .map((item, idx) => {
          const product = productMap.get(item.productId!)!;
          return {
            key: `${product.id}-dup-${idx}`,
            productId: product.id,
            name: product.name,
            unit: product.unit,
            unitPriceMinor: product.unitPriceMinor,
            quantity: item.quantityMilli / 1000,
            gstRateBasisPoints: product.gstRateBasisPoints,
          };
        });
    }
  }

  return (
    <BillingScreen
      settings={{
        gstEnabledByDefault: business.settings.gstEnabledByDefault,
        pricesIncludeGst: business.settings.pricesIncludeGst,
        billLevelDiscountEnabled: business.settings.billLevelDiscountEnabled,
        itemLevelDiscountEnabled: business.settings.itemLevelDiscountEnabled,
        allowManualPriceOverride: business.settings.allowManualPriceOverride,
        currency: business.settings.currency,
      }}
      businessState={business.state}
      prefillItems={prefillItems}
    />
  );
}
