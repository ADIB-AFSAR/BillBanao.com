import { z } from "zod";

const discountSchema = z.object({
  type: z.enum(["NONE", "FIXED", "PERCENTAGE"]),
  value: z.coerce.number().min(0).default(0),
});

export const invoiceLineSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  // Quantity is entered as a human decimal (e.g. 1.5) and converted to
  // milli-units server-side; it must be greater than 0.
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  // Optional manual override of the unit price (only honoured if the
  // business's settings allow it - re-checked server-side either way).
  unitPriceOverride: z.coerce.number().nonnegative().optional(),
  discount: discountSchema.optional(),
});
export type InvoiceLineFormInput = z.infer<typeof invoiceLineSchema>;

export const createInvoiceSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  items: z.array(invoiceLineSchema).min(1, "Invoice must contain at least one item"),
  billDiscount: discountSchema.optional(),
  gstEnabled: z.boolean(),
  customerState: z.string().trim().max(60).optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]),
  amountPaid: z.coerce.number().nonnegative(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),

  // Set by the offline queue so the original bill creation time
  // is preserved when the invoice eventually syncs.
  invoiceDate: z.string().datetime().optional(),
  
  // Set only by the offline-sync path (lib/offline/outbox.ts) so a retried
  // sync can never create a duplicate invoice. Omitted for normal online use.
  idempotencyKey: z.string().trim().max(100).optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
