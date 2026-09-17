"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
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
    const session = await requireSession();
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

    return business;
  });
}

export async function updateBusinessSettingsAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireSession();
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

    return settings;
  });
}
