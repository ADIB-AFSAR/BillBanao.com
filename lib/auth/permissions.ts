import "server-only";
import { prisma } from "@/lib/db";
import type { SessionPayload } from "./session";
import { effectivePermissions, type StaffPermissions } from "@/lib/permissions-shared";

export type { StaffPermissions };
export { effectivePermissions, PERMISSION_LABELS, DEFAULT_STAFF_PERMISSIONS } from "@/lib/permissions-shared";

/** Fetches the current user's effective permissions fresh from the database. */
export async function getMyPermissions(session: SessionPayload): Promise<StaffPermissions> {
  if (session.role === "OWNER") return effectivePermissions({ role: "OWNER" });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: {
      role: true,
      canViewAnalytics: true,
      canManageProducts: true,
      canManageCustomers: true,
      canManageCategories: true,
      canViewInvoiceHistory: true,
    },
  });
  return effectivePermissions(user);
}

/**
 * Throws PERMISSION_DENIED if the current session's user doesn't have the
 * given permission. Always fetched fresh from the database - never trust a
 * cached/JWT copy for this, since an owner revoking access should take
 * effect on the very next request, not the next login.
 */
export async function assertPermission(session: SessionPayload, permission: keyof StaffPermissions): Promise<void> {
  const perms = await getMyPermissions(session);
  if (!perms[permission]) {
    throw new Error("PERMISSION_DENIED");
  }
}
