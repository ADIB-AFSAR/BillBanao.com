import { redirect } from "next/navigation";
import { getBusinessAction } from "@/lib/actions/business";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default async function SettingsPage() {
  const result = await getBusinessAction();
  if (!result.ok) redirect("/login");
  const business = result.data;
  const settings = business.settings;
  if (!settings) redirect("/business/setup");

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8">
      <h1 className="text-xl font-semibold text-ink mb-1">Settings</h1>
      <p className="text-sm text-slate mb-6">Manage your business profile and invoice defaults.</p>

      <SettingsTabs
        profileDefaults={{
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
        settingsDefaults={{
          invoicePrefix: settings.invoicePrefix,
          invoiceNumberPad: settings.invoiceNumberPad,
          currency: settings.currency as "INR" | "USD" | "EUR" | "GBP",
          gstEnabledByDefault: settings.gstEnabledByDefault,
          pricesIncludeGst: settings.pricesIncludeGst,
          defaultGstRateBasisPoints: settings.defaultGstRateBasisPoints,
          billLevelDiscountEnabled: settings.billLevelDiscountEnabled,
          itemLevelDiscountEnabled: settings.itemLevelDiscountEnabled,
          allowManualPriceOverride: settings.allowManualPriceOverride,
          receiptFooter: settings.receiptFooter ?? "",
          termsAndConditions: settings.termsAndConditions ?? "",
        }}
      />
    </div>
  );
}
