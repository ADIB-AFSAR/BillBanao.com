import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getBusinessAction } from "@/lib/actions/business";
import { getInvoiceAction } from "@/lib/actions/invoices";
import { prisma } from "@/lib/db";
import { BillingScreen } from "@/components/billing/billing-screen";
import type { CartItem } from "@/components/billing/billing-screen";
import type { CachedBusinessInfo } from "@/lib/offline/db";

// Sensible offline-safe defaults for when the business/settings row can't
// be fetched (server reachable, database briefly down/slow). Billing must
// keep working in that case - the screen itself is what falls back to its
// own IndexedDB product/customer cache and queues the sale for later sync.
const FALLBACK_BUSINESS_INFO: CachedBusinessInfo = {
  name: "",
  address: null,
  phone: null,
  email: null,
  gstin: null,
  logoUrl: null,
  state: null,
  currency: "INR",
  receiptFooter: null,
  termsAndConditions: null,
};

const FALLBACK_SETTINGS = {
  gstEnabledByDefault: false,
  pricesIncludeGst: false,
  billLevelDiscountEnabled: false,
  itemLevelDiscountEnabled: false,
  allowManualPriceOverride: false,
  currency: "INR",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>;
}) {
  // The enclosing app/(app)/layout.tsx already confirmed the session
  // exists (redirecting to /login itself if not) before this page ever
  // runs. Re-reading it here is just a cheap JWT decode (no DB call) to
  // get businessId - it is never the reason to bounce someone to login.
  const session = await getSession();
  if (!session) redirect("/login");

  const result = await getBusinessAction();
  const business = result.ok ? result.data : null;

  // Only route to the one-time setup flow when we positively know
  // settings are missing. If the database is unreachable we simply don't
  // know either way, so fall through and let billing keep working with
  // defaults rather than guessing and sending an already-set-up business
  // through onboarding again.
  if (business && !business.settings) redirect("/business/setup");

  const { duplicate } = await searchParams;
  let prefillItems: CartItem[] | undefined;

  if (duplicate) {
    try {
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
    } catch {
      // Couldn't look up the invoice to duplicate (DB hiccup) - just start
      // a normal empty bill instead of failing the whole page.
    }
  }

  const businessInfo: CachedBusinessInfo = business
    ? {
        name: business.name,
        address: business.address,
        phone: business.phone,
        email: business.email,
        gstin: business.gstin,
        logoUrl: business.logoUrl,
        state: business.state,
        currency: business.settings!.currency,
        receiptFooter: business.settings!.receiptFooter,
        termsAndConditions: business.settings!.termsAndConditions,
      }
    : FALLBACK_BUSINESS_INFO;

  const settings = business?.settings
    ? {
        gstEnabledByDefault: business.settings.gstEnabledByDefault,
        pricesIncludeGst: business.settings.pricesIncludeGst,
        billLevelDiscountEnabled: business.settings.billLevelDiscountEnabled,
        itemLevelDiscountEnabled: business.settings.itemLevelDiscountEnabled,
        allowManualPriceOverride: business.settings.allowManualPriceOverride,
        currency: business.settings.currency,
      }
    : FALLBACK_SETTINGS;

  return (
    <BillingScreen
      businessId={session.businessId}
      businessInfo={businessInfo}
      settings={settings}
      businessState={business?.state ?? null}
      prefillItems={prefillItems}
    />
  );
}
