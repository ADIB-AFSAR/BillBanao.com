"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";
import { runAction } from "./action-result";

/**
 * Returns the single most-recent active notification this business hasn't
 * exhausted its view cap on (and hasn't dismissed), or null. Deliberately
 * shows at most one at a time so banners don't stack.
 */
export async function getActiveNotificationAction() {
  return runAction(async () => {
    const session = await requireSession();

    const notifications = await prisma.notification.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: { views: { where: { businessId: session.businessId } } },
    });

    const eligible = notifications.find((n: (typeof notifications)[number]) => {
      const view = n.views[0];
      if (!view) return true;
      if (view.dismissedAt) return false;
      if (n.maxViewsPerBusiness != null && view.viewCount >= n.maxViewsPerBusiness) return false;
      return true;
    });

    if (!eligible) return null;
    return {
      id: eligible.id,
      title: eligible.title,
      body: eligible.body,
      ctaLabel: eligible.ctaLabel,
      ctaHref: eligible.ctaHref,
    };
  });
}

export async function recordNotificationViewAction(notificationId: string) {
  return runAction(async () => {
    const session = await requireSession();

    const existing = await prisma.notificationView.findUnique({
      where: { notificationId_businessId: { notificationId, businessId: session.businessId } },
    });

    if (existing) {
      await prisma.notificationView.update({
        where: { id: existing.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      });
    } else {
      await prisma.notificationView.create({
        data: { notificationId, businessId: session.businessId, viewCount: 1, lastViewedAt: new Date() },
      });
    }
    return { ok: true };
  });
}

export async function dismissNotificationAction(notificationId: string) {
  return runAction(async () => {
    const session = await requireSession();

    await prisma.notificationView.upsert({
      where: { notificationId_businessId: { notificationId, businessId: session.businessId } },
      update: { dismissedAt: new Date() },
      create: {
        notificationId,
        businessId: session.businessId,
        viewCount: 1,
        lastViewedAt: new Date(),
        dismissedAt: new Date(),
      },
    });
    return { ok: true };
  });
}
