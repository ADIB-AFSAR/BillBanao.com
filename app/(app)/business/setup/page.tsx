import { redirect } from "next/navigation";
import { getBusinessAction } from "@/lib/actions/business";
import { SetupForm } from "@/components/settings/setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";

export default async function BusinessSetupPage() {
  const result = await getBusinessAction();
  if (!result.ok) redirect("/login");
  const business = result.data;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-medium text-amber-dark uppercase tracking-wide mb-1">Getting started</p>
        <h1 className="text-xl font-semibold text-ink">Tell us about your business</h1>
        <p className="text-sm text-slate mt-1">
          This appears on every receipt you print. You can change it anytime from Settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>Name, address and GSTIN show up on the receipt header.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetupForm
            defaultValues={{
              name: business.name,
              ownerName: business.ownerName ?? "",
              address: business.address ?? "",
              phone: business.phone ?? "",
              email: business.email ?? "",
              website: business.website ?? "",
              gstin: business.gstin ?? "",
              state: business.state ?? "",
              city: business.city ?? "",
              pincode: business.pincode ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
