import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { PendingSyncPanel } from "@/components/invoices/pending-sync-panel";
import { getPlanFeaturesAction } from "@/lib/actions/plans";
import { getBusinessAction } from "@/lib/actions/business";
import { getMyPermissionsAction } from "@/lib/actions/permissions";
import { RestrictedNotice } from "@/components/layout/restricted-notice";

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const permissions = await getMyPermissionsAction();
  if (permissions.ok && !permissions.data.canViewInvoiceHistory) {
    return (
      <RestrictedNotice message="You don't have permission to view invoice history. Ask the business owner to grant it from Team settings." />
    );
  }

  const [features, business] = await Promise.all([getPlanFeaturesAction(), getBusinessAction()]);

  return (
    <div className="p-4 sm:p-6">
      {/* Uses the JWT-derived businessId, not business.data.id, so the
          pending-sync queue - the thing that matters most while offline -
          still shows even if the business row itself failed to load. */}
      <PendingSyncPanel businessId={session.businessId} />
      <InvoiceTable
        canExportPdf={features.ok ? features.data.canExportPdf : false}
        businessName={business.ok ? business.data.name : "Business"}
        businessId={session.businessId}
      />
    </div>
  );
}