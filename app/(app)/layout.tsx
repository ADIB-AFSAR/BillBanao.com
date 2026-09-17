import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    select: { name: true },
  });

  return (
    <AppShell businessName={business?.name ?? ""} userName={session.name}>
      {children}
    </AppShell>
  );
}
