import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TeamTable } from "@/components/team/team-table";
import { RestrictedNotice } from "@/components/layout/restricted-notice";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role !== "OWNER") {
    return (
      <div className="p-4 sm:p-8">
        <RestrictedNotice message="Only the business owner can manage the team." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">Team</h1>
      <p className="text-sm text-slate mb-6">
        Add staff logins and control exactly what each person can see and do.
      </p>
      <TeamTable />
    </div>
  );
}
