"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { platformSettingsSchema } from "@/schemas/admin";
import { runAction } from "./action-result";

const SINGLETON_ID = "singleton";

export async function getPlatformSettingsAction() {
  return runAction(async () => {
    await requireAdminSession();
    const settings = await prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {},
      create: { id: SINGLETON_ID },
    });
    return settings;
  });
}

export async function updatePlatformSettingsAction(formData: unknown) {
  return runAction(async () => {
    await requireAdminSession();
    const input = platformSettingsSchema.parse(formData);

    const settings = await prisma.platformSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { trialDurationDays: input.trialDurationDays },
      create: { id: SINGLETON_ID, trialDurationDays: input.trialDurationDays },
    });

    revalidatePath("/admin/settings");
    return settings;
  });
}
