"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { effectiveDisplayStatus } from "@/lib/subscription";
import { runAction } from "./action-result";

export async function getPlansPageDataAction() {
  return runAction(async () => {
    const session = await requireSession();

    const [business, plans] = await Promise.all([
      prisma.business.findUniqueOrThrow({
        where: { id: session.businessId },
        include: { plan: true, requestedPlan: true },
      }),
      prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [customerCount, invoicesThisMonth] = await Promise.all([
      prisma.customer.count({ where: { businessId: session.businessId } }),
      prisma.invoice.count({ where: { businessId: session.businessId, invoiceDate: { gte: monthStart } } }),
    ]);

    return {
      currentPlan: business.plan,
      requestedPlan: business.requestedPlan,
      requestedAt: business.requestedAt,
      status: effectiveDisplayStatus(business),
      trialEndsAt: business.trialEndsAt,
      plans,
      usage: { customerCount, invoicesThisMonth },
    };
  });
}

export async function requestPlanAction(planId: string) {
  return runAction(async () => {
    // Deliberately requireSession(), not requireActiveSession() - a
    // suspended or past-due business is exactly who most needs to be able
    // to ask for a plan.
    const session = await requireSession();

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new Error("That plan isn't available right now.");

    await prisma.business.update({
      where: { id: session.businessId },
      data: { requestedPlanId: planId, requestedAt: new Date() },
    });

    revalidatePath("/plans");
    return { ok: true };
  });
}

export async function getPlanFeaturesAction() {
  return runAction(async () => {
    const session = await requireSession();
    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      select: { plan: { select: { canExportPdf: true } } },
    });
    return { canExportPdf: business?.plan?.canExportPdf ?? false };
  });
}
