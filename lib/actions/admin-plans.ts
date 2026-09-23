"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { planSchema } from "@/schemas/admin";
import { runAction } from "./action-result";

export async function listPlansForAdminAction() {
  return runAction(async () => {
    await requireAdminSession();
    return prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { currentFor: true, requestedFor: true } } },
    });
  });
}

export async function createPlanAction(formData: unknown) {
  return runAction(async () => {
    await requireAdminSession();
    const input = planSchema.parse(formData);

    const plan = await prisma.plan.create({
      data: {
        name: input.name,
        priceLabel: input.priceLabel,
        description: input.description || null,
        maxCustomers: input.maxCustomers,
        maxInvoicesPerMonth: input.maxInvoicesPerMonth,
        maxConcurrentLogins: input.maxConcurrentLogins,
        canExportPdf: input.canExportPdf,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/plans");
    return plan;
  });
}

export async function updatePlanAction(id: string, formData: unknown) {
  return runAction(async () => {
    await requireAdminSession();
    const input = planSchema.parse(formData);

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name: input.name,
        priceLabel: input.priceLabel,
        description: input.description || null,
        maxCustomers: input.maxCustomers,
        maxInvoicesPerMonth: input.maxInvoicesPerMonth,
        maxConcurrentLogins: input.maxConcurrentLogins,
        canExportPdf: input.canExportPdf,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      },
    });

    revalidatePath("/admin/plans");
    revalidatePath("/plans");
    return plan;
  });
}

export async function deletePlanAction(id: string) {
  return runAction(async () => {
    await requireAdminSession();
    const inUse = await prisma.business.count({
      where: { OR: [{ planId: id }, { requestedPlanId: id }] },
    });
    if (inUse > 0) {
      throw new Error(
        `${inUse} business${inUse === 1 ? " is" : "es are"} currently on or requesting this plan. Deactivate it instead of deleting, or move them to a different plan first.`
      );
    }
    await prisma.plan.delete({ where: { id } });
    revalidatePath("/admin/plans");
    revalidatePath("/plans");
    return { id };
  });
}
