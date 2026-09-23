export interface StaffPermissions {
  canViewAnalytics: boolean;
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canManageCategories: boolean;
  canViewInvoiceHistory: boolean;
}

export const PERMISSION_LABELS: Record<keyof StaffPermissions, { label: string; description: string }> = {
  canViewAnalytics: {
    label: "View sales analytics",
    description: "Today's sales, pending payments, the sales trend chart, and top products on the dashboard.",
  },
  canManageProducts: {
    label: "Manage products",
    description: "Add, edit, and delete products. Everyone can still search products at the billing screen.",
  },
  canManageCustomers: {
    label: "Manage customers",
    description: "Add, edit, and delete customers.",
  },
  canManageCategories: {
    label: "Manage categories",
    description: "Add, edit, and delete categories.",
  },
  canViewInvoiceHistory: {
    label: "View invoice history",
    description: "Browse and search past invoices. Everyone can still view a receipt right after billing it.",
  },
};

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  canViewAnalytics: false,
  canManageProducts: true,
  canManageCustomers: true,
  canManageCategories: true,
  canViewInvoiceHistory: true,
};

/** An OWNER always has full access; a STAFF member has exactly what's stored on their row. */
export function effectivePermissions(user: { role: "OWNER" | "STAFF" } & Partial<StaffPermissions>): StaffPermissions {
  if (user.role === "OWNER") {
    return {
      canViewAnalytics: true,
      canManageProducts: true,
      canManageCustomers: true,
      canManageCategories: true,
      canViewInvoiceHistory: true,
    };
  }
  return {
    canViewAnalytics: user.canViewAnalytics ?? DEFAULT_STAFF_PERMISSIONS.canViewAnalytics,
    canManageProducts: user.canManageProducts ?? DEFAULT_STAFF_PERMISSIONS.canManageProducts,
    canManageCustomers: user.canManageCustomers ?? DEFAULT_STAFF_PERMISSIONS.canManageCustomers,
    canManageCategories: user.canManageCategories ?? DEFAULT_STAFF_PERMISSIONS.canManageCategories,
    canViewInvoiceHistory: user.canViewInvoiceHistory ?? DEFAULT_STAFF_PERMISSIONS.canViewInvoiceHistory,
  };
}
