"use server";

import { prisma } from "@/lib/db";
import { requireSession, requireActiveSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { customerSchema } from "@/schemas/common";
import { runAction } from "./action-result";

export async function listCustomersAction(search?: string) {
  return runAction(async () => {
    const session = await requireSession();
    return prisma.customer.findMany({
      where: {
        businessId: session.businessId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
  });
}

export async function getCustomerAction(id: string) {
  return runAction(async () => {
    const session = await requireSession();
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    return customer;
  });
}

export async function createCustomerAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageCustomers");
    const input = customerSchema.parse(formData);

    const business = await prisma.business.findUnique({
      where: { id: session.businessId },
      select: { plan: { select: { maxCustomers: true } } },
    });
    if (business?.plan?.maxCustomers != null) {
      const existingCount = await prisma.customer.count({ where: { businessId: session.businessId } });
      if (existingCount >= business.plan.maxCustomers) {
        throw new Error(
          `You've reached your plan's limit of ${business.plan.maxCustomers} customers. Upgrade your plan to add more.`
        );
      }
    }

    return prisma.customer.create({
      data: {
        businessId: session.businessId,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        gstin: input.gstin || null,
        state: input.state || null,
        city: input.city || null,
        pincode: input.pincode || null,
      },
    });
  });
}

export async function updateCustomerAction(id: string, formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageCustomers");
    const input = customerSchema.parse(formData);

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }

    return prisma.customer.update({
      where: { id },
      data: {
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        gstin: input.gstin || null,
        state: input.state || null,
        city: input.city || null,
        pincode: input.pincode || null,
      },
    });
  });
}

export async function deleteCustomerAction(id: string) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageCustomers");
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    await prisma.customer.delete({ where: { id } });
    return { id };
  });
}

/**
 * Returns every customer for this business, unpaginated - used only to
 * warm the client-side offline cache (lib/offline/cache.ts) when the
 * billing screen loads. listCustomersAction stays for normal typeahead use.
 */
export async function listAllCustomersForCacheAction() {
  return runAction(async () => {
    const session = await requireSession();
    return prisma.customer.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
    });
  });
}
