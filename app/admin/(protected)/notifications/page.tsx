import { NotificationAdminTable } from "@/components/admin/notification-admin-table";

export default function AdminNotificationsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">Notifications</h1>
      <p className="text-sm text-slate mb-6">
        Nudge owners toward upgrading with a dismissible banner. Cap how many times each business
        sees it, or leave unlimited until they dismiss it themselves.
      </p>
      <NotificationAdminTable />
    </div>
  );
}
