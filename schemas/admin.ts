import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const SUBSCRIPTION_STATUS_VALUES = ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED"] as const;

export const subscriptionUpdateSchema = z.object({
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUS_VALUES),
  planId: z.string().trim().optional().or(z.literal("")), // "" = no plan assigned
  paidUntil: z.string().trim().optional().or(z.literal("")), // yyyy-mm-dd from a <input type="date">
  adminNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;

// A blank string in a "limit" field means "unlimited" (stored as null).
const limitField = z
  .union([z.coerce.number().int().min(0), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const planSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(80),
  priceLabel: z.string().trim().min(1, "Add a price label, e.g. \u20b9999/month").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  maxCustomers: limitField,
  maxInvoicesPerMonth: limitField,
  maxConcurrentLogins: limitField,
  canExportPdf: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});
export type PlanInput = z.infer<typeof planSchema>;

export const platformSettingsSchema = z.object({
  trialDurationDays: z.coerce.number().int().min(0).max(365),
});
export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;

export const notificationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().min(1, "Message is required").max(500),
  ctaLabel: z.string().trim().min(1).max(40).default("View plans"),
  ctaHref: z.string().trim().min(1).max(200).default("/plans"),
  isActive: z.boolean(),
  maxViewsPerBusiness: z
    .union([z.coerce.number().int().min(1), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});
export type NotificationInput = z.infer<typeof notificationSchema>;
