"use server";

import { prisma } from "@/lib/db";
import { requireSession, requireActiveSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { productSchema } from "@/schemas/common";
import { toBasisPoints, toMinorUnits } from "@/lib/money";
import { runAction } from "./action-result";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  status?: "all" | "active" | "inactive";
  sortBy?: "name" | "price" | "stock" | "updated";
  sortDir?: "asc" | "desc";
}

export async function listProductsAction(params: ProductListParams = {}) {
  return runAction(async () => {
    const session = await requireSession();

    const where: Prisma.ProductWhereInput = {
      businessId: session.businessId,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.status === "active" ? { isActive: true } : {}),
      ...(params.status === "inactive" ? { isActive: false } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { sku: { contains: params.search, mode: "insensitive" } },
              { barcode: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      params.sortBy === "price"
        ? { unitPriceMinor: params.sortDir ?? "asc" }
        : params.sortBy === "stock"
          ? { stockQty: params.sortDir ?? "asc" }
          : params.sortBy === "updated"
            ? { updatedAt: params.sortDir ?? "desc" }
            : { name: params.sortDir ?? "asc" };

    return prisma.product.findMany({
      where,
      orderBy,
      include: { category: true },
    });
  });
}

/** Fast lookup used by the POS billing screen's product search box. */
export async function searchProductsForBillingAction(query: string) {
  return runAction(async () => {
    const session = await requireSession();
    if (!query.trim()) {
      return prisma.product.findMany({
        where: { businessId: session.businessId, isActive: true },
        orderBy: { name: "asc" },
        take: 20,
        include: { category: true },
      });
    }
    return prisma.product.findMany({
      where: {
        businessId: session.businessId,
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 20,
      include: { category: true },
    });
  });
}

export async function getProductAction(id: string) {
  return runAction(async () => {
    const session = await requireSession();
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product || product.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    return product;
  });
}

export async function createProductAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageProducts");
    const input = productSchema.parse(formData);

    return prisma.product.create({
      data: {
        businessId: session.businessId,
        name: input.name,
        sku: input.sku || null,
        barcode: input.barcode || null,
        categoryId: input.categoryId || null,
        description: input.description || null,
        unitPriceMinor: toMinorUnits(input.unitPrice),
        costPriceMinor: input.costPrice != null ? toMinorUnits(input.costPrice) : null,
        unit: input.unit,
        gstRateBasisPoints: toBasisPoints(input.gstRatePercent),
        trackStock: input.trackStock,
        stockQty: input.trackStock ? (input.stockQty ?? 0) : null,
        lowStockThreshold: input.trackStock ? (input.lowStockThreshold ?? 5) : null,
        isActive: input.isActive,
      },
    });
  });
}

export async function updateProductAction(id: string, formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageProducts");
    const input = productSchema.parse(formData);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }

    return prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        sku: input.sku || null,
        barcode: input.barcode || null,
        categoryId: input.categoryId || null,
        description: input.description || null,
        unitPriceMinor: toMinorUnits(input.unitPrice),
        costPriceMinor: input.costPrice != null ? toMinorUnits(input.costPrice) : null,
        unit: input.unit,
        gstRateBasisPoints: toBasisPoints(input.gstRatePercent),
        trackStock: input.trackStock,
        stockQty: input.trackStock ? (input.stockQty ?? existing.stockQty ?? 0) : null,
        lowStockThreshold: input.trackStock ? (input.lowStockThreshold ?? 5) : null,
        isActive: input.isActive,
      },
    });
  });
}

export async function deleteProductAction(id: string) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageProducts");
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    await prisma.product.delete({ where: { id } });
    return { id };
  });
}

export async function adjustStockAction(id: string, quantityChange: number, reason: string) {
  return runAction(async () => {
    const session = await requireActiveSession();
    await assertPermission(session, "canManageProducts");
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    if (!existing.trackStock) {
      throw new Error("Stock tracking is not enabled for this product.");
    }

    return prisma.$transaction(async (tx) => {
      const newStock = (existing.stockQty ?? 0) + quantityChange;
      const product = await tx.product.update({
        where: { id },
        data: { stockQty: newStock },
      });
      await tx.inventoryTransaction.create({
        data: {
          businessId: session.businessId,
          productId: id,
          type: "ADJUSTMENT",
          quantityChange,
          resultingStock: newStock,
          reason: reason || null,
        },
      });
      return product;
    }, { timeout: 10_000 });
  });
}

/**
 * Returns every active product for this business, unpaginated - used only
 * to warm the client-side offline cache (lib/offline/cache.ts) when the
 * billing screen loads. searchProductsForBillingAction stays capped at 20
 * results for normal typeahead use; this one intentionally isn't capped.
 */
export async function listAllProductsForCacheAction() {
  return runAction(async () => {
    const session = await requireSession();
    return prisma.product.findMany({
      where: { businessId: session.businessId, isActive: true },
      orderBy: { name: "asc" },
      include: { category: true },
    });
  });
}
