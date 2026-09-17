"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { categorySchema } from "@/schemas/common";
import { runAction } from "./action-result";

export async function listCategoriesAction() {
  return runAction(async () => {
    const session = await requireSession();
    return prisma.category.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  });
}

export async function createCategoryAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireSession();
    const input = categorySchema.parse(formData);

    return prisma.category.create({
      data: {
        businessId: session.businessId,
        name: input.name,
        description: input.description || null,
      },
    });
  });
}

export async function updateCategoryAction(id: string, formData: unknown) {
  return runAction(async () => {
    const session = await requireSession();
    const input = categorySchema.parse(formData);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }

    return prisma.category.update({
      where: { id },
      data: { name: input.name, description: input.description || null },
    });
  });
}

export async function deleteCategoryAction(id: string) {
  return runAction(async () => {
    const session = await requireSession();
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    await prisma.category.delete({ where: { id } });
    return { id };
  });
}
