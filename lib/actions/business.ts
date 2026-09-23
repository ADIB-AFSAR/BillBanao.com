"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession, requireOwnerSession } from "@/lib/auth/session";
import { businessProfileSchema, businessSettingsSchema } from "@/schemas/common";
import { runAction } from "./action-result";

export async function getBusinessAction() {
  return runAction(async () => {
    const session = await requireSession();
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: session.businessId },
      include: { settings: true },
    });
    return business;
  });
}

export async function updateBusinessProfileAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireOwnerSession();
    const input = businessProfileSchema.parse(formData);

    const business = await prisma.business.update({
      where: { id: session.businessId },
      data: {
        name: input.name,
        ownerName: input.ownerName || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        gstin: input.gstin || null,
        state: input.state || null,
        city: input.city || null,
        pincode: input.pincode || null,
        logoUrl: input.logoUrl || null,
      },
    });

    // The business name/address also render in the sidebar and on receipts
    // across the whole app, not just this page, so invalidate broadly -
    // without this, Next's client-side Router Cache can keep serving the
    // pre-update page on the next soft navigation, making the change look
    // like it "didn't save" even though the database is already correct.
    revalidatePath("/", "layout");

    return business;
  });
}

export async function updateBusinessSettingsAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireOwnerSession();
    const input = businessSettingsSchema.parse(formData);

    const settings = await prisma.businessSettings.update({
      where: { businessId: session.businessId },
      data: {
        invoicePrefix: input.invoicePrefix,
        invoiceNumberPad: input.invoiceNumberPad,
        currency: input.currency,
        gstEnabledByDefault: input.gstEnabledByDefault,
        pricesIncludeGst: input.pricesIncludeGst,
        defaultGstRateBasisPoints: input.defaultGstRateBasisPoints,
        billLevelDiscountEnabled: input.billLevelDiscountEnabled,
        itemLevelDiscountEnabled: input.itemLevelDiscountEnabled,
        allowManualPriceOverride: input.allowManualPriceOverride,
        receiptFooter: input.receiptFooter || null,
        termsAndConditions: input.termsAndConditions || null,
      },
    });

    // See the comment in updateBusinessProfileAction above - these settings
    // (GST defaults, discount toggles) are read fresh on the billing screen
    // and settings page, both of which need to stop serving cached HTML
    // for this business the moment it changes.
    revalidatePath("/", "layout");

    return settings;
  });
}
