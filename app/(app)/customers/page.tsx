import { CustomerTable } from "@/components/customers/customer-table";
import { getPlanFeaturesAction } from "@/lib/actions/plans";
import { getBusinessAction } from "@/lib/actions/business";

export default async function CustomersPage() {
  const [features, business] = await Promise.all([getPlanFeaturesAction(), getBusinessAction()]);

  return (
    <div className="p-4 sm:p-6">
      <CustomerTable
        canExportPdf={features.ok ? features.data.canExportPdf : false}
        businessName={business.ok ? business.data.name : "Business"}
      />
    </div>
  );
}
