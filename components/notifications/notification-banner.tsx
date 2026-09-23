"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import {
  getActiveNotificationAction,
  recordNotificationViewAction,
  dismissNotificationAction,
} from "@/lib/actions/notifications";

interface ActiveNotification {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

export function NotificationBanner() {
  const [notification, setNotification] = useState<ActiveNotification | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveNotificationAction().then((res) => {
      if (cancelled || !res.ok || !res.data) return;
      setNotification(res.data);
      // Count this render as one view. Fire-and-forget - a missed count on
      // a flaky request isn't worth blocking the UI over.
      recordNotificationViewAction(res.data.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDismiss() {
    if (!notification) return;
    setDismissing(true);
    await dismissNotificationAction(notification.id);
    setDismissing(false);
    setNotification(null);
  }

  if (!notification) return null;

  return (
    <div className="no-print bg-amber/10 border-b border-amber/30 px-4 sm:px-6 py-2.5">
      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        <Megaphone className="size-4 text-amber-dark shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-medium text-ink">{notification.title}</span>{" "}
          <span className="text-ink-2">{notification.body}</span>
        </div>
        <Link
          href={notification.ctaHref}
          className="shrink-0 text-sm font-medium text-amber-dark hover:underline whitespace-nowrap"
        >
          {notification.ctaLabel}
        </Link>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss"
          className="shrink-0 text-slate hover:text-ink p-1"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
