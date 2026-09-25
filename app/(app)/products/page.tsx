import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ProductTable } from "@/components/products/product-table";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="p-4 sm:p-6">
      <ProductTable businessId={session.businessId} />
    </div>
  );
}