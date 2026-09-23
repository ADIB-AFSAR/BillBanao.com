import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getMyPermissions } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function PlansLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Same reasoning as app/(app)/layout.tsx: degrade gracefully rather than
  // throw if the database is unreachable, so this shell never blocks a page
  // underneath it that might otherwise still be usable.
  let businessName = "";
  let canViewInvoiceHistory = true;
  try {
    const [business, permissions] = await Promise.all([
      prisma.business.findUnique({ where: { id: session.businessId }, select: { name: true } }),
      getMyPermissions(session),
    ]);
    businessName = business?.name ?? "";
    canViewInvoiceHistory = permissions.canViewInvoiceHistory;
  } catch {
    // proceed in degraded mode
  }

  return (
    <AppShell
      businessName={businessName}
      businessId={session.businessId}
      userName={session.name}
      role={session.role}
      canViewInvoiceHistory={canViewInvoiceHistory}
    >
      {children}
    </AppShell>
  );
}
