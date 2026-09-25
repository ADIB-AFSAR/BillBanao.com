import { CustomerTable } from "@/components/customers/customer-table";
import { getPlanFeaturesAction } from "@/lib/actions/plans";
import { getBusinessAction } from "@/lib/actions/business";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [features, business] = await Promise.all([getPlanFeaturesAction(), getBusinessAction()]);

  return (
    <div className="p-4 sm:p-6">
      <CustomerTable
        canExportPdf={features.ok ? features.data.canExportPdf : false}
        businessName={business.ok ? business.data.name : "Business"}
        businessId={session.businessId}
      />
    </div>
  );
}