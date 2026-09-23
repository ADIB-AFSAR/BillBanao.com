import { z } from "zod";

const permissionFields = {
  canViewAnalytics: z.boolean(),
  canManageProducts: z.boolean(),
  canManageCustomers: z.boolean(),
  canManageCategories: z.boolean(),
  canViewInvoiceHistory: z.boolean(),
};

export const inviteStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  ...permissionFields,
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updatePermissionsSchema = z.object(permissionFields);
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
