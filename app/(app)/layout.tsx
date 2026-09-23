import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getMyPermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { AccessSuspendedScreen } from "@/components/layout/access-suspended-screen";
import { isBusinessAccessActive, effectiveDisplayStatus, type SubscriptionStatus } from "@/lib/subscription";

type BusinessSummary = { name: string; subscriptionStatus: SubscriptionStatus; trialEndsAt: Date | null } | null;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // getSession() above only verifies the JWT (no DB call), so it still
  // works with no server connection at all. Everything below DOES need the
  // database - and this layout wraps every page, including /billing, whose
  // whole point is to keep working when the connection is unreliable. So a
  // DB failure here must degrade gracefully, never crash the route: falling
  // back to a generic shell (business name is blank, permissions default to
  // "not restricted") is far better than making the billing screen
  // unreachable purely because this wrapper couldn't reach the database.
  // The billing screen's own offline cache/outbox is what actually keeps it
  // usable; this is just making sure the shell around it doesn't block that.
  let business: BusinessSummary = null;
  let canViewInvoiceHistory = true;
  try {
    const [businessRow, permissions] = await Promise.all([
      prisma.business.findUnique({
        where: { id: session.businessId },
        select: { name: true, subscriptionStatus: true, trialEndsAt: true },
      }),
      getMyPermissions(session),
    ]);
    business = businessRow;
    canViewInvoiceHistory = permissions.canViewInvoiceHistory;
  } catch {
    // Couldn't reach the database - proceed in degraded mode rather than
    // throwing (which would otherwise be caught by app/(app)/error.tsx, but
    // would take down every page including /billing with it).
  }

  if (business && !isBusinessAccessActive(business)) {
    const status = effectiveDisplayStatus(business);
    return (
      <AccessSuspendedScreen
        businessName={business.name}
        status={status === "SUSPENDED" ? "SUSPENDED" : "PAST_DUE"}
      />
    );
  }

  return (
    <AppShell
      businessName={business?.name ?? ""}
      businessId={session.businessId}
      userName={session.name}
      role={session.role}
      canViewInvoiceHistory={canViewInvoiceHistory}
    >
      {children}
    </AppShell>
  );
}
