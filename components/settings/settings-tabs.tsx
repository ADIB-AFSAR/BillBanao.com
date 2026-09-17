"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BusinessProfileForm } from "./business-profile-form";
import { InvoiceSettingsForm } from "./invoice-settings-form";
import type { BusinessProfileInput, BusinessSettingsInput } from "@/schemas/common";

export function SettingsTabs({
  profileDefaults,
  settingsDefaults,
}: {
  profileDefaults: Partial<BusinessProfileInput>;
  settingsDefaults: BusinessSettingsInput;
}) {
  const [tab, setTab] = useState<"profile" | "invoice">("profile");

  return (
    <div>
      <div className="flex gap-1 border-b border-paper-line mb-6">
        {[
          { id: "profile" as const, label: "Business profile" },
          { id: "invoice" as const, label: "Invoice & GST settings" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-amber text-ink" : "border-transparent text-slate hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <BusinessProfileForm defaultValues={profileDefaults} />
      ) : (
        <InvoiceSettingsForm defaultValues={settingsDefaults} />
      )}
    </div>
  );
}
