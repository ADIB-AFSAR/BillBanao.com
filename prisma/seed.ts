/**
 * Development seed data.
 *
 * Run with:  npm run db:seed
 * (this runs automatically after `npx prisma migrate dev` as well, via the
 * "prisma.seed" entry in package.json)
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { calculateInvoiceTotals } from "../lib/billing/calculate";
import type { InvoiceLineInput } from "../lib/billing/types";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean slate for repeatable seeding in development.
  await prisma.notificationView.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.business.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.platformSettings.deleteMany();
  await prisma.platformAdmin.deleteMany();

  // Platform-wide defaults (trial length etc). Editable later at /admin/settings.
  await prisma.platformSettings.create({ data: { id: "singleton", trialDurationDays: 30 } });

  // Platform admin account - separate from any business login. Sign in at
  // /admin/login to see every registered business, their products and
  // categories, and to flip a business's billing status by hand.
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.platformAdmin.create({
    data: {
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      name: "Platform Admin",
    },
  });
  console.log("Platform admin login -> /admin/login -> admin@example.com / admin123");

  // A small, realistic plan lineup - selectable by owners, never free text.
  const [starterPlan, standardPlan, premiumPlan] = await Promise.all([
    prisma.plan.create({
      data: {
        name: "Starter",
        priceLabel: "\u20b9499/month",
        description: "For a single counter just getting going.",
        maxCustomers: 100,
        maxInvoicesPerMonth: 200,
        maxConcurrentLogins: 1,
        canExportPdf: false,
        sortOrder: 0,
      },
    }),
    prisma.plan.create({
      data: {
        name: "Standard",
        priceLabel: "\u20b9999/month",
        description: "Most shops land here - more room, PDF reports included.",
        maxCustomers: 1000,
        maxInvoicesPerMonth: 1000,
        maxConcurrentLogins: 2,
        canExportPdf: true,
        sortOrder: 1,
      },
    }),
    prisma.plan.create({
      data: {
        name: "Premium",
        priceLabel: "\u20b92499/month",
        description: "Multiple counters, no caps.",
        maxCustomers: null,
        maxInvoicesPerMonth: null,
        maxConcurrentLogins: 5,
        canExportPdf: true,
        sortOrder: 2,
      },
    }),
  ]);

  console.log(`Created plans: ${starterPlan.name}, ${standardPlan.name}, ${premiumPlan.name}`);

  await prisma.notification.create({
    data: {
      title: "New year offer",
      body: "Get 20% off the Standard plan this month only.",
      ctaLabel: "View plans",
      ctaHref: "/plans",
      isActive: true,
      maxViewsPerBusiness: 3,
    },
  });

  const paidUntil = new Date();
  paidUntil.setDate(paidUntil.getDate() + 30);

  const business = await prisma.business.create({
    data: {
      name: "ABC General Store",
      ownerName: "Aditi Sharma",
      subscriptionStatus: "ACTIVE",
      planId: standardPlan.id,
      paidUntil,
      adminNotes: "Paid via UPI at signup (seed data).",
      address: "Shop 12, Sector 18 Market, Noida",
      phone: "+91 98765 43210",
      email: "hello@abcgeneralstore.example",
      gstin: "09ABCDE1234F1Z5",
      state: "Uttar Pradesh",
      city: "Noida",
      pincode: "201301",
      settings: {
        create: {
          invoicePrefix: "INV-",
          invoiceNumberPad: 6,
          currency: "INR",
          gstEnabledByDefault: true,
          pricesIncludeGst: false,
          defaultGstRateBasisPoints: 1800,
          receiptFooter: "Thank you for shopping with us!",
          termsAndConditions: "Goods once sold will only be exchanged within 7 days with a valid receipt.",
        },
      },
    },
    include: { settings: true },
  });

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email: "owner@example.com",
      passwordHash,
      name: "Aditi Sharma",
      role: "OWNER",
      businessId: business.id,
    },
  });
  console.log("Demo login -> email: owner@example.com / password: password123");

  // A staff login to demonstrate the permissions system: can run the
  // billing screen and manage products/customers, but can't see sales
  // analytics or edit business settings.
  const staffPasswordHash = await bcrypt.hash("staff123", 10);
  await prisma.user.create({
    data: {
      email: "staff@example.com",
      passwordHash: staffPasswordHash,
      name: "Rahul Singh",
      role: "STAFF",
      businessId: business.id,
      canViewAnalytics: false,
      canManageProducts: true,
      canManageCustomers: true,
      canManageCategories: false,
      canViewInvoiceHistory: true,
    },
  });
  console.log("Demo staff login -> email: staff@example.com / password: staff123");

  const [grocery, electronics, clothing, services] = await Promise.all([
    prisma.category.create({ data: { businessId: business.id, name: "Grocery" } }),
    prisma.category.create({ data: { businessId: business.id, name: "Electronics" } }),
    prisma.category.create({ data: { businessId: business.id, name: "Clothing" } }),
    prisma.category.create({ data: { businessId: business.id, name: "Services" } }),
  ]);

  // Demonstrates arbitrary-depth categories: Clothing -> Ladies -> Suits -> Cotton.
  // Grocery/Electronics/Services deliberately stay flat - depth is opt-in per
  // branch, not forced on the whole catalog.
  const ladies = await prisma.category.create({
    data: { businessId: business.id, name: "Ladies", parentId: clothing.id },
  });
  const suits = await prisma.category.create({
    data: { businessId: business.id, name: "Suits", parentId: ladies.id },
  });
  const cottonSuits = await prisma.category.create({
    data: { businessId: business.id, name: "Cotton", parentId: suits.id },
  });

  const rice = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: grocery.id,
      name: "Basmati Rice",
      sku: "RICE-1KG",
      unitPriceMinor: 10_000,
      unit: "KG",
      gstRateBasisPoints: 500,
      trackStock: true,
      stockQty: 120,
      lowStockThreshold: 15,
    },
  });
  const sugar = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: grocery.id,
      name: "Sugar",
      sku: "SUGAR-1KG",
      unitPriceMinor: 5_000,
      unit: "KG",
      gstRateBasisPoints: 500,
      trackStock: true,
      stockQty: 80,
      lowStockThreshold: 10,
    },
  });
  const notebook = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: electronics.id,
      name: "Notebook",
      sku: "NOTE-A5",
      unitPriceMinor: 6_000,
      unit: "PIECE",
      gstRateBasisPoints: 1200,
      trackStock: true,
      stockQty: 200,
      lowStockThreshold: 20,
    },
  });
  const tshirt = await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: cottonSuits.id,
      name: "Cotton T-Shirt",
      sku: "TSHIRT-M",
      unitPriceMinor: 49_900,
      unit: "PIECE",
      gstRateBasisPoints: 1200,
      trackStock: true,
      stockQty: 45,
      lowStockThreshold: 5,
    },
  });
  await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: services.id,
      name: "Home Delivery",
      sku: "SVC-DELIVERY",
      unitPriceMinor: 4_000,
      unit: "SERVICE",
      gstRateBasisPoints: 1800,
      trackStock: false,
    },
  });
  await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: electronics.id,
      name: "USB Cable",
      sku: "USB-C-1M",
      barcode: "8901234567890",
      unitPriceMinor: 19_900,
      unit: "PIECE",
      gstRateBasisPoints: 1800,
      trackStock: true,
      stockQty: 3,
      lowStockThreshold: 5,
    },
  });

  const customer = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Rohit Verma",
      phone: "+91 91234 56780",
      email: "rohit.verma@example.com",
      city: "Noida",
      state: "Uttar Pradesh",
    },
  });

  // A couple of example invoices, computed through the same calculation
  // engine the app uses, so the seed data is internally consistent.
  async function createSeedInvoice(opts: {
    items: { product: typeof rice; quantity: number }[];
    customerId?: string;
    customerState?: string | null;
    daysAgo: number;
    amountPaidFull?: boolean;
  }) {
    const lines: InvoiceLineInput[] = opts.items.map((i, idx) => ({
      id: String(idx),
      unitPriceMinor: i.product.unitPriceMinor,
      quantityMilli: Math.round(i.quantity * 1000),
      gstRateBasisPoints: i.product.gstRateBasisPoints,
    }));
    const taxType = !opts.customerState || opts.customerState === business.state ? "CGST_SGST" : "IGST";
    const totals = calculateInvoiceTotals({
      lines,
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType,
      amountPaidMinor: undefined,
    });

    const settingsRow = await prisma.businessSettings.update({
      where: { businessId: business.id },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const usedNumber = settingsRow.nextInvoiceNumber - 1;
    const invoiceNumber = `${settingsRow.invoicePrefix}${String(usedNumber).padStart(settingsRow.invoiceNumberPad, "0")}`;

    const invoiceDate = new Date();
    invoiceDate.setDate(invoiceDate.getDate() - opts.daysAgo);

    await prisma.invoice.create({
      data: {
        businessId: business.id,
        invoiceNumber,
        invoiceDate,
        customerId: opts.customerId,
        customerNameSnapshot: opts.customerId ? customer.name : "Walk-in Customer",
        businessStateSnapshot: business.state,
        customerStateSnapshot: opts.customerState ?? null,
        gstApplied: true,
        pricesIncludeGst: false,
        taxType,
        subtotalMinor: totals.subtotalMinor,
        taxableAmountMinor: totals.taxableAmountMinor,
        cgstMinor: totals.cgstMinor,
        sgstMinor: totals.sgstMinor,
        igstMinor: totals.igstMinor,
        gstTotalMinor: totals.gstTotalMinor,
        grandTotalMinor: totals.grandTotalMinor,
        paymentMethod: "CASH",
        paymentStatus: totals.paymentStatus,
        amountPaidMinor: totals.amountPaidMinor,
        amountDueMinor: totals.amountDueMinor,
        changeMinor: totals.changeMinor,
        items: {
          create: totals.lines.map((line, idx) => ({
            productId: opts.items[idx].product.id,
            productNameSnapshot: opts.items[idx].product.name,
            skuSnapshot: opts.items[idx].product.sku,
            unitSnapshot: opts.items[idx].product.unit,
            unitPriceMinor: line.unitPriceMinor,
            quantityMilli: line.quantityMilli,
            taxableAmountMinor: line.taxableAmountMinor,
            gstRateBasisPoints: line.gstRateBasisPoints,
            cgstMinor: line.cgstMinor,
            sgstMinor: line.sgstMinor,
            igstMinor: line.igstMinor,
            lineTotalMinor: line.totalMinor,
            sortOrder: idx,
          })),
        },
        payments: { create: [{ method: "CASH", amountMinor: totals.amountPaidMinor }] },
      },
    });
    console.log(`  created ${invoiceNumber} for ${formatRupees(totals.grandTotalMinor)}`);
  }

  function formatRupees(minor: number) {
    return `₹${(minor / 100).toFixed(2)}`;
  }

  await createSeedInvoice({
    items: [{ product: rice, quantity: 2 }, { product: sugar, quantity: 1 }],
    customerId: customer.id,
    customerState: "Uttar Pradesh",
    daysAgo: 0,
  });
  await createSeedInvoice({
    items: [{ product: tshirt, quantity: 1 }, { product: notebook, quantity: 3 }],
    daysAgo: 1,
  });
  await createSeedInvoice({
    items: [{ product: notebook, quantity: 5 }],
    customerId: customer.id,
    customerState: "Maharashtra", // inter-state -> IGST
    daysAgo: 3,
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
