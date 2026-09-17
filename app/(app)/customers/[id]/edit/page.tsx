import { notFound } from "next/navigation";
import { getCustomerAction } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customers/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCustomerAction(id);
  if (!result.ok) notFound();
  const customer = result.data;

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            customerId={customer.id}
            defaultValues={{
              name: customer.name,
              phone: customer.phone ?? "",
              email: customer.email ?? "",
              address: customer.address ?? "",
              gstin: customer.gstin ?? "",
              state: customer.state ?? "",
              city: customer.city ?? "",
              pincode: customer.pincode ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
