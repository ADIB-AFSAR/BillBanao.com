import { redirect } from "next/navigation";
import { getPlatformSettingsAction } from "@/lib/actions/admin-settings";
import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

export default async function AdminSettingsPage() {
  const result = await getPlatformSettingsAction();
  if (!result.ok) redirect("/admin/login");

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-6">Platform settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Trial period</CardTitle>
        </CardHeader>
        <CardContent>
          <PlatformSettingsForm defaultValues={{ trialDurationDays: result.data.trialDurationDays }} />
        </CardContent>
      </Card>
    </div>
  );
}
