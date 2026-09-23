import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { AdminTopbar } from "@/components/admin/admin-topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-paper">
      <AdminTopbar adminName={session.name} />
      <main>{children}</main>
    </div>
  );
}
