"use client";

import { useRouter } from "next/navigation";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import type { BusinessProfileInput } from "@/schemas/common";

export function SetupForm({ defaultValues }: { defaultValues: Partial<BusinessProfileInput> }) {
  const router = useRouter();
  return (
    <BusinessProfileForm
      defaultValues={defaultValues}
      submitLabel="Save and continue"
      onSaved={() => {
        router.push("/dashboard");
        router.refresh();
      }}
    />
  );
}
