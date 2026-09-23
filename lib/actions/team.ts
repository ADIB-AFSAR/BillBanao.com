"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireOwnerSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { inviteStaffSchema, updatePermissionsSchema } from "@/schemas/team";
import { runAction } from "./action-result";

export async function listTeamMembersAction() {
  return runAction(async () => {
    const session = await requireOwnerSession();
    return prisma.user.findMany({
      where: { businessId: session.businessId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  });
}

export async function inviteStaffAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireOwnerSession();
    const input = inviteStaffSchema.parse(formData);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error("An account with that email already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        businessId: session.businessId,
        email: input.email,
        name: input.name,
        passwordHash,
        role: "STAFF",
        canViewAnalytics: input.canViewAnalytics,
        canManageProducts: input.canManageProducts,
        canManageCustomers: input.canManageCustomers,
        canManageCategories: input.canManageCategories,
        canViewInvoiceHistory: input.canViewInvoiceHistory,
      },
    });

    revalidatePath("/team");
    return user;
  });
}

export async function updateStaffPermissionsAction(userId: string, formData: unknown) {
  return runAction(async () => {
    const session = await requireOwnerSession();
    const input = updatePermissionsSchema.parse(formData);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    if (target.role === "OWNER") {
      throw new Error("The owner always has full access - there's nothing to change here.");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: input,
    });

    revalidatePath("/team");
    return updated;
  });
}

export async function setStaffActiveAction(userId: string, isActive: boolean) {
  return runAction(async () => {
    const session = await requireOwnerSession();

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    if (target.role === "OWNER") {
      throw new Error("You can't deactivate the owner account.");
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { isActive } });

    if (!isActive) {
      // requireSession() re-checks isActive on every request, so access is
      // already cut off immediately. This just also frees their
      // Plan.maxConcurrentLogins slot right away instead of waiting for
      // their session to expire.
      await prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    revalidatePath("/team");
    return updated;
  });
}
