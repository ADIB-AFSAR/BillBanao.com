"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { runAction } from "./action-result";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface DashboardStats {
  todaySalesMinor: number;
  todayInvoiceCount: number;
  pendingPaymentsMinor: number;
  productCount: number;
  lowStockCount: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stockQty: number | null;
    lowStockThreshold: number | null;
    unit: string;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    grandTotalMinor: number;
    paymentStatus: string;
    customerNameSnapshot: string | null;
    customer: { name: string } | null;
  }>;
  topProducts: Array<{ name: string; quantityMilli: number; totalMinor: number }>;
  salesTrend: Array<{ date: string; amountMinor: number }>;
}

export async function getDashboardStatsAction() {
  return runAction(async (): Promise<DashboardStats> => {
    const session = await requireSession();
    const businessId = session.businessId;
    const todayStart = startOfToday();

    const [
      todaySales,
      todayInvoiceCount,
      pendingPayments,
      productCount,
      lowStockProducts,
      recentInvoices,
      topProducts,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { businessId, invoiceDate: { gte: todayStart } },
        _sum: { grandTotalMinor: true },
      }),
      prisma.invoice.count({
        where: { businessId, invoiceDate: { gte: todayStart } },
      }),
      prisma.invoice.aggregate({
        where: { businessId, paymentStatus: { in: ["UNPAID", "PARTIALLY_PAID"] } },
        _sum: { amountDueMinor: true },
      }),
      prisma.product.count({ where: { businessId, isActive: true } }),
      prisma.product.findMany({
        where: {
          businessId,
          trackStock: true,
          isActive: true,
        },
        select: { id: true, name: true, stockQty: true, lowStockThreshold: true, unit: true },
      }),
      prisma.invoice.findMany({
        where: { businessId },
        orderBy: { invoiceDate: "desc" },
        take: 8,
        include: { customer: true },
      }),
      prisma.invoiceItem.groupBy({
        by: ["productNameSnapshot"],
        where: { invoice: { businessId } },
        _sum: { quantityMilli: true, lineTotalMinor: true },
        orderBy: { _sum: { lineTotalMinor: "desc" } },
        take: 5,
      }),
    ]);

    const lowStock = lowStockProducts.filter(
      (p: { stockQty: number | null; lowStockThreshold: number | null }) =>
        p.stockQty != null && p.lowStockThreshold != null && p.stockQty <= p.lowStockThreshold
    );

    // Last 7 days of sales for the trend chart.
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const recentForChart = await prisma.invoice.findMany({
      where: { businessId, invoiceDate: { gte: sevenDaysAgo } },
      select: { invoiceDate: true, grandTotalMinor: true },
    });
    const salesByDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      salesByDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const inv of recentForChart) {
      const key = inv.invoiceDate.toISOString().slice(0, 10);
      if (key in salesByDay) salesByDay[key] += inv.grandTotalMinor;
    }

    return {
      todaySalesMinor: todaySales._sum.grandTotalMinor ?? 0,
      todayInvoiceCount,
      pendingPaymentsMinor: pendingPayments._sum.amountDueMinor ?? 0,
      productCount,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
      recentInvoices,
      topProducts: topProducts.map((p: { productNameSnapshot: string; _sum: { quantityMilli: number | null; lineTotalMinor: number | null } }) => ({
        name: p.productNameSnapshot,
        quantityMilli: p._sum.quantityMilli ?? 0,
        totalMinor: p._sum.lineTotalMinor ?? 0,
      })),
      salesTrend: Object.entries(salesByDay).map(([date, amountMinor]) => ({ date, amountMinor })),
    };
  });
}
