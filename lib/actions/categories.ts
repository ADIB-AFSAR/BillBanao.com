"use server";

import { prisma } from "@/lib/db";
import { requireSession, requireActiveSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { categorySchema } from "@/schemas/common";
import { runAction } from "./action-result";

export async function listCategoriesAction() {
  return runAction(async () => {
    const session = await requireSession();
    return prisma.category.findMany({
      where: { businessId: session.businessId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true, children: true } } },
    });
  });
}

/** Walks up the parent chain to make sure `candidateParentId` is never `categoryId` itself or a descendant of it (which would create a cycle). */
async function assertNotOwnDescendant(categoryId: string, candidateParentId: string) {
  let cursor: string | null = candidateParentId;
  let guard = 0;
  while (cursor && guard < 50) {
    if (cursor === categoryId) {
      throw new Error("A category can't be moved under one of its own subcategories.");
    }
    const parent: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
    guard++;
  }
}

export async function createCategoryAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageCategories");
    const input = categorySchema.parse(formData);

    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.businessId !== session.businessId) {
        throw new Error("That parent category could not be found.");
      }
    }

    return prisma.category.create({
      data: {
        businessId: session.businessId,
        name: input.name,
        description: input.description || null,
        parentId: input.parentId || null,
      },
    });
  });
}

export async function updateCategoryAction(id: string, formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageCategories");
    const input = categorySchema.parse(formData);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new Error("A category can't be its own parent.");
      }
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.businessId !== session.businessId) {
        throw new Error("That parent category could not be found.");
      }
      await assertNotOwnDescendant(id, input.parentId);
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description || null,
        parentId: input.parentId || null,
      },
    });
  });
}

export async function deleteCategoryAction(id: string) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageCategories");
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    if (existing._count.children > 0) {
      throw new Error(
        "This category has subcategories. Delete or move them first, then delete this one."
      );
    }
    await prisma.category.delete({ where: { id } });
    return { id };
  });
}
