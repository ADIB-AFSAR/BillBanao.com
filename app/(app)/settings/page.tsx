import { redirect } from "next/navigation";
import { getBusinessAction } from "@/lib/actions/business";
import { getSession } from "@/lib/auth/session";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { RestrictedNotice } from "@/components/layout/restricted-notice";
import { DataUnavailable } from "@/components/layout/data-unavailable";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "OWNER") {
    return (
      <div className="p-4 sm:p-8">
        <RestrictedNotice message="Only the business owner can change business profile and invoice settings." />
      </div>
    );
  }

  const result = await getBusinessAction();
  if (!result.ok) {
    return <DataUnavailable message="Couldn't load your business settings right now." retryHref="/settings" />;
  }
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
