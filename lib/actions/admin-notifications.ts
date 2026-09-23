"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { notificationSchema } from "@/schemas/admin";
import { runAction } from "./action-result";

export async function listNotificationsForAdminAction() {
  return runAction(async () => {
    await requireAdminSession();
    return prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { views: true } } },
    });
  });
}

export async function createNotificationAction(formData: unknown) {
  return runAction(async () => {
    await requireAdminSession();
    const input = notificationSchema.parse(formData);

    const notification = await prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        ctaLabel: input.ctaLabel,
        ctaHref: input.ctaHref,
        isActive: input.isActive,
        maxViewsPerBusiness: input.maxViewsPerBusiness,
      },
    });

    revalidatePath("/admin/notifications");
    return notification;
  });
}

export async function updateNotificationAction(id: string, formData: unknown) {
  return runAction(async () => {
    await requireAdminSession();
    const input = notificationSchema.parse(formData);

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        title: input.title,
        body: input.body,
        ctaLabel: input.ctaLabel,
        ctaHref: input.ctaHref,
        isActive: input.isActive,
        maxViewsPerBusiness: input.maxViewsPerBusiness,
      },
    });

    revalidatePath("/admin/notifications");
    return notification;
  });
}

export async function deleteNotificationAction(id: string) {
  return runAction(async () => {
    await requireAdminSession();
    await prisma.notification.delete({ where: { id } });
    revalidatePath("/admin/notifications");
    return { id };
  });
}
