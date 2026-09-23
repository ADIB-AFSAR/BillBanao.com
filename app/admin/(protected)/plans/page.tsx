import { PlanAdminTable } from "@/components/admin/plan-admin-table";

export default function AdminPlansPage() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">Plans</h1>
      <p className="text-sm text-slate mb-6">
        Define what each plan includes. Owners select from this list on their Plans page - never
        free text.
      </p>
      <PlanAdminTable />
    </div>
  );
}
