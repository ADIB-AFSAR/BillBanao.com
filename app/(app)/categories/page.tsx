import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CategoryManager } from "@/components/categories/category-manager";

export default async function CategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <CategoryManager businessId={session.businessId} />;
}