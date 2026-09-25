"use server";

import { prisma } from "@/lib/db";
import { requireActiveSession, requireSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createInvoiceSchema } from "@/schemas/invoice";
import { calculateInvoiceTotals } from "@/lib/billing/calculate";
import type { Discount, InvoiceLineInput, TaxType } from "@/lib/billing/types";
import { toMilliQty } from "@/lib/money";
import { runAction } from "./action-result";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Works out whether an intra-state (CGST+SGST) or inter-state (IGST) tax
 * split applies. This lives in the billing/server layer - never assume the
 * UI is the only place that decides this, since the client cannot be
 * trusted to compute tax splits correctly (or honestly).
 */
function resolveTaxType(businessState: string | null, customerState: string | null): TaxType {
  if (!businessState || !customerState) return "CGST_SGST"; // sensible default: assume intra-state
  return businessState.trim().toLowerCase() === customerState.trim().toLowerCase()
    ? "CGST_SGST"
    : "IGST";
}

export async function createInvoiceAction(formData: unknown) {
  return runAction(async () => {
    const session = await requireActiveSession();
    const input = createInvoiceSchema.parse(formData);

    // Idempotency check first, before any other work: if this exact
    // offline-queued bill already made it through on a previous sync
    // attempt (e.g. the response was lost after the server had already
    // committed), return the existing invoice instead of billing again.
    if (input.idempotencyKey) {
      const existing = await prisma.invoice.findUnique({
        where: { businessId_idempotencyKey: { businessId: session.businessId, idempotencyKey: input.idempotencyKey } },
        include: { items: true, payments: true, customer: true },
      });
      if (existing) return existing;
    }

    const business = await prisma.business.findUniqueOrThrow({
      where: { id: session.businessId },
      include: { settings: true, plan: true },
    });
    if (!business.settings) throw new Error("Business settings are missing. Please contact support.");

    if (business.plan?.maxInvoicesPerMonth != null) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const invoicesThisMonth = await prisma.invoice.count({
        where: { businessId: session.businessId, invoiceDate: { gte: monthStart } },
      });
      if (invoicesThisMonth >= business.plan.maxInvoicesPerMonth) {
        throw new Error(
          `You've reached your plan's limit of ${business.plan.maxInvoicesPerMonth} invoices this month. Upgrade your plan to create more.`
        );
      }
    }

    const productIds = input.items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, businessId: session.businessId },
    });
    const productMap = new Map<string, (typeof products)[number]>(
      products.map((p: (typeof products)[number]) => [p.id, p])
    );

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error("One of the selected products could not be found.");
      if (!product.isActive) throw new Error(`"${product.name}" is not currently available for sale.`);
      if (product.trackStock) {
        const requestedMilli = toMilliQty(item.quantity);
        const availableMilli = (product.stockQty ?? 0) * 1000;
        if (requestedMilli > availableMilli) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stockQty ?? 0}.`);
        }
      }
    }

    let customer = null;
    if (input.customerId) {
      customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!customer || customer.businessId !== session.businessId) {
        throw new Error("FORBIDDEN");
      }
    }

    const gstEnabled = input.gstEnabled;
    const customerState = customer?.state || input.customerState || null;
    const taxType = resolveTaxType(business.state, customerState);

    const lines: InvoiceLineInput[] = input.items.map((item, idx) => {
      const product = productMap.get(item.productId)!;
      const unitPriceMinor =
        business.settings!.allowManualPriceOverride && item.unitPriceOverride != null
          ? Math.round(item.unitPriceOverride * 100)
          : product.unitPriceMinor;

      const discount: Discount | undefined =
        business.settings!.itemLevelDiscountEnabled && item.discount
          ? {
              type: item.discount.type,
              value:
                item.discount.type === "FIXED"
                  ? Math.round(item.discount.value * 100)
                  : Math.round(item.discount.value * 100), // percentage stored as basis points (e.g. 10% form input -> 1000)
            }
          : undefined;

      return {
        id: `${idx}-${product.id}`,
        unitPriceMinor,
        quantityMilli: toMilliQty(item.quantity),
        gstRateBasisPoints: product.gstRateBasisPoints,
        discount,
      };
    });

    const billDiscount: Discount | undefined =
      business.settings.billLevelDiscountEnabled && input.billDiscount
        ? {
            type: input.billDiscount.type,
            value: Math.round(input.billDiscount.value * 100),
          }
        : undefined;

    const totals = calculateInvoiceTotals({
      lines,
      billDiscount,
      gstEnabled,
      pricesIncludeGst: business.settings.pricesIncludeGst,
      taxType,
      amountPaidMinor: Math.round(input.amountPaid * 100),
    });

    const invoice = await prisma.$transaction(async (tx) => {
      // Atomically claim the next invoice number. The row-level lock taken
      // by this UPDATE serializes concurrent checkouts so two invoices can
      // never be issued the same number.
      const settings = await tx.businessSettings.update({
        where: { businessId: session.businessId },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const usedNumber = settings.nextInvoiceNumber - 1;
      const invoiceNumber = `${settings.invoicePrefix}${String(usedNumber).padStart(
        settings.invoiceNumberPad,
        "0"
      )}`;

      const created = await tx.invoice.create({
        data: {
          invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : undefined,
          businessId: session.businessId,
          invoiceNumber,
          idempotencyKey: input.idempotencyKey ?? null,
          customerId: customer?.id ?? null,
          customerNameSnapshot: customer?.name ?? "Walk-in Customer",
          businessStateSnapshot: business.state,
          customerStateSnapshot: customerState,
          gstApplied: gstEnabled,
          pricesIncludeGst: business.settings!.pricesIncludeGst,
          taxType,
          subtotalMinor: totals.subtotalMinor,
          billDiscountType: billDiscount?.type ?? "NONE",
          billDiscountValue: billDiscount?.value ?? 0,
          billDiscountMinor: totals.billDiscountMinor,
          taxableAmountMinor: totals.taxableAmountMinor,
          cgstMinor: totals.cgstMinor,
          sgstMinor: totals.sgstMinor,
          igstMinor: totals.igstMinor,
          gstTotalMinor: totals.gstTotalMinor,
          roundOffMinor: totals.roundOffMinor,
          grandTotalMinor: totals.grandTotalMinor,
          paymentMethod: input.paymentMethod,
          paymentStatus: totals.paymentStatus,
          amountPaidMinor: totals.amountPaidMinor,
          amountDueMinor: totals.amountDueMinor,
          changeMinor: totals.changeMinor,
          notes: input.notes || null,
          createdById: session.userId,
          items: {
            create: totals.lines.map((line, idx) => {
              const product = productMap.get(input.items[idx].productId)!;
              return {
                productId: product.id,
                productNameSnapshot: product.name,
                skuSnapshot: product.sku,
                unitSnapshot: product.unit,
                unitPriceMinor: line.unitPriceMinor,
                quantityMilli: line.quantityMilli,
                lineDiscountType: input.items[idx].discount?.type ?? "NONE",
                lineDiscountValue: input.items[idx].discount
                  ? Math.round(input.items[idx].discount!.value * 100)
                  : 0,
                lineDiscountMinor: line.discountMinor,
                taxableAmountMinor: line.taxableAmountMinor,
                gstRateBasisPoints: line.gstRateBasisPoints,
                cgstMinor: line.cgstMinor,
                sgstMinor: line.sgstMinor,
                igstMinor: line.igstMinor,
                lineTotalMinor: line.totalMinor,
                sortOrder: idx,
              };
            }),
          },
          payments: {
            create: [
              {
                method: input.paymentMethod,
                amountMinor: totals.amountPaidMinor,
              },
            ],
          },
        },
        include: { items: true, payments: true, customer: true },
      });

      // Decrement stock for tracked products and record the movement.
      // NOTE: stock counts are whole-unit integers in this version, so a
      // sale of a fractional quantity (e.g. 1.5 kg) is rounded to the
      // nearest whole unit for the stock ledger. Tracking fractional stock
      // precisely is listed as a future improvement in the README.
      //
      // Product updates still happen one at a time (each has a different
      // new stock value), but the inventory-log rows are collected and
      // written in a single batched `createMany` instead of one `create`
      // per line, to cut down round-trips inside the transaction.
      const inventoryRows: {
        businessId: string;
        productId: string;
        type: "SALE";
        quantityChange: number;
        resultingStock: number;
        invoiceId: string;
        reason: string;
      }[] = [];

      for (const item of input.items) {
        const product = productMap.get(item.productId)!;
        if (!product.trackStock) continue;
        const quantityChange = -Math.round(item.quantity);
        const newStock = (product.stockQty ?? 0) + quantityChange;
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: newStock },
        });
        inventoryRows.push({
          businessId: session.businessId,
          productId: product.id,
          type: "SALE",
          quantityChange,
          resultingStock: newStock,
          invoiceId: created.id,
          reason: `Sale on invoice ${invoiceNumber}`,
        });
      }

      if (inventoryRows.length > 0) {
        await tx.inventoryTransaction.createMany({ data: inventoryRows });
      }

      return created;
    }, { timeout: 20_000, maxWait: 10_000 });

    return invoice;
  });
}

export interface InvoiceListParams {
  search?: string;
  customerId?: string;
  paymentStatus?: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  dateFrom?: string;
  dateTo?: string;
}

export async function listInvoicesAction(params: InvoiceListParams = {}) {
  return runAction(async () => {
    const session = await requireSession();
    await assertPermission(session, "canViewInvoiceHistory");

    const where: Prisma.InvoiceWhereInput = {
      businessId: session.businessId,
      ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.search
        ? {
            OR: [
              { invoiceNumber: { contains: params.search, mode: "insensitive" } },
              { customerNameSnapshot: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            invoiceDate: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59") } : {}),
            },
          }
        : {}),
    };

    return prisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      include: { customer: true },
      take: 200,
    });
  });
}

export async function getInvoiceAction(id: string) {
  return runAction(async () => {
    const session = await requireSession();
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: true,
        payments: true,
        business: { include: { settings: true } },
      },
    });
    if (!invoice || invoice.businessId !== session.businessId) {
      throw new Error("FORBIDDEN");
    }
    return invoice;
  });
}
