import { z } from "zod";

export const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  ownerName: z.string().trim().min(2, "Your name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// GSTIN: 15 characters, standard Indian GSTIN pattern.
const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((val) => val === "" || gstinPattern.test(val), {
    message: "Enter a valid 15-character GSTIN",
  })
  .optional()
  .or(z.literal(""));

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(120),
  ownerName: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
  gstin: gstinSchema,
  state: z.string().trim().max(60).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  pincode: z.string().trim().max(10).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export const businessSettingsSchema = z.object({
  invoicePrefix: z.string().trim().min(1).max(20),
  invoiceNumberPad: z.coerce.number().int().min(1).max(12),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]),
  gstEnabledByDefault: z.boolean(),
  pricesIncludeGst: z.boolean(),
  defaultGstRateBasisPoints: z.coerce.number().int().min(0).max(10_000),
  billLevelDiscountEnabled: z.boolean(),
  itemLevelDiscountEnabled: z.boolean(),
  allowManualPriceOverride: z.boolean(),
  receiptFooter: z.string().trim().max(300).optional().or(z.literal("")),
  termsAndConditions: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

export const UNIT_VALUES = [
  "PIECE",
  "KG",
  "GRAM",
  "LITER",
  "METER",
  "BOX",
  "PACKET",
  "DOZEN",
  "HOUR",
  "SERVICE",
] as const;

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name cannot be empty").max(160),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  barcode: z.string().trim().max(60).optional().or(z.literal("")),
  categoryId: z.string().trim().optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  unitPrice: z.coerce.number().nonnegative("Price cannot be negative"),
  costPrice: z.coerce.number().nonnegative().optional(),
  unit: z.enum(UNIT_VALUES),
  gstRatePercent: z.coerce
    .number()
    .min(0, "GST percentage must be between 0 and 100")
    .max(100, "GST percentage must be between 0 and 100"),
  trackStock: z.boolean(),
  stockQty: z.coerce.number().int().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name cannot be empty").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  parentId: z.string().trim().optional().or(z.literal("")), // "" = top-level
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name cannot be empty").max(160),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().max(160).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  gstin: gstinSchema,
  state: z.string().trim().max(60).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  pincode: z.string().trim().max(10).optional().or(z.literal("")),
});
export type CustomerInput = z.infer<typeof customerSchema>;
