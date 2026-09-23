"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { subscriptionUpdateSchema } from "@/schemas/admin";
import { effectiveDisplayStatus } from "@/lib/subscription";
import { runAction } from "./action-result";

export async function listBusinessesForAdminAction(search?: string) {
  return runAction(async () => {
    await requireAdminSession();

    const businesses = await prisma.business.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        users: { orderBy: { createdAt: "asc" }, take: 1 },
        plan: true,
        requestedPlan: true,
        _count: { select: { products: true, categories: true, customers: true, invoices: true } },
      },
    });

    return businesses.map((b: (typeof businesses)[number]) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      state: b.state,
      createdAt: b.createdAt,
      ownerEmail: b.users[0]?.email ?? null,
      ownerName: b.users[0]?.name ?? null,
      subscriptionStatus: b.subscriptionStatus,
      displayStatus: effectiveDisplayStatus(b),
      trialEndsAt: b.trialEndsAt,
      paidUntil: b.paidUntil,
      planName: b.plan?.name ?? null,
      requestedPlanName: b.requestedPlan?.name ?? null,
      requestedAt: b.requestedAt,
      productCount: b._count.products,
      categoryCount: b._count.categories,
      customerCount: b._count.customers,
      invoiceCount: b._count.invoices,
    }));
  });
}

export async function getBusinessDetailForAdminAction(businessId: string) {
  return runAction(async () => {
    await requireAdminSession();

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      include: {
        users: { orderBy: { createdAt: "asc" } },
        settings: true,
        plan: true,
        requestedPlan: true,
      },
    });

    const [products, categories, plans] = await Promise.all([
      prisma.product.findMany({
        where: { businessId },
        orderBy: { name: "asc" },
        include: { category: true },
      }),
      prisma.category.findMany({
        where: { businessId },
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } },
      }),
      prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    return { business, products, categories, plans };
  });
}

export async function updateBusinessSubscriptionAction(businessId: string, formData: unknown) {
  return runAction(async () => {
    await requireAdminSession();
    const input = subscriptionUpdateSchema.parse(formData);

    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: input.subscriptionStatus,
        planId: input.planId || null,
        // Assigning a plan (or changing status) resolves any pending request.
        requestedPlanId: null,
        requestedAt: null,
        paidUntil: input.paidUntil ? new Date(input.paidUntil) : null,
        adminNotes: input.adminNotes || null,
      },
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin");
    return business;
  });
}

/** Approves a business's pending plan request as-is (status -> ACTIVE, plan assigned). */
export async function approveRequestedPlanAction(businessId: string) {
  return runAction(async () => {
    await requireAdminSession();
    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    if (!business.requestedPlanId) throw new Error("This business has no pending plan request.");

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        planId: business.requestedPlanId,
        subscriptionStatus: "ACTIVE",
        requestedPlanId: null,
        requestedAt: null,
      },
    });

    revalidatePath(`/admin/businesses/${businessId}`);
    revalidatePath("/admin");
    return updated;
  });
}

export async function getPlatformStatsAction() {
  return runAction(async () => {
    await requireAdminSession();

    const [total, active, trialing, pastDue, suspended, pendingRequests] = await Promise.all([
      prisma.business.count(),
      prisma.business.count({ where: { subscriptionStatus: "ACTIVE" } }),
      prisma.business.count({ where: { subscriptionStatus: "TRIALING" } }),
      prisma.business.count({ where: { subscriptionStatus: "PAST_DUE" } }),
      prisma.business.count({ where: { subscriptionStatus: "SUSPENDED" } }),
      prisma.business.count({ where: { requestedPlanId: { not: null } } }),
    ]);

    return { total, active, trialing, pastDue, suspended, pendingRequests };
  });
}
