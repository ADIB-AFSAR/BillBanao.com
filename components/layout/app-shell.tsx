"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { NotificationBanner } from "@/components/notifications/notification-banner";
import { SyncManager } from "@/components/offline/sync-manager";
import { OfflineRouteWarmer } from "@/components/offline/offline-route-warmer";
import { OfflineNavigation } from "../offline/offline-navigation";

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p.startsWith("/dashboard"), title: "Dashboard" },
  { match: (p) => p.startsWith("/billing"), title: "New Bill" },
  { match: (p) => p === "/products", title: "Products" },
  { match: (p) => p.startsWith("/products/new"), title: "Add Product" },
  { match: (p) => p.startsWith("/products/"), title: "Edit Product" },
  { match: (p) => p.startsWith("/categories"), title: "Categories" },
  { match: (p) => p === "/customers", title: "Customers" },
  { match: (p) => p.startsWith("/customers/new"), title: "Add Customer" },
  { match: (p) => p.startsWith("/customers/"), title: "Edit Customer" },
  { match: (p) => p.startsWith("/invoices"), title: "Invoice History" },
  { match: (p) => p.startsWith("/team"), title: "Team" },
  { match: (p) => p.startsWith("/settings"), title: "Settings" },
  { match: (p) => p.startsWith("/plans"), title: "Plans & Billing" },
  { match: (p) => p.startsWith("/business/setup"), title: "Business Setup" },
];

export function AppShell({
  businessName,
  businessId,
  userName,
  role,
  canViewInvoiceHistory,
  children,
}: {
  businessName: string;
  businessId: string;
  userName: string;
  role: "OWNER" | "STAFF";
  canViewInvoiceHistory: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const title = TITLES.find((t) => t.match(pathname))?.title ?? "";

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar businessName={businessName} role={role} canViewInvoiceHistory={canViewInvoiceHistory} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          businessName={businessName}
          userName={userName}
          title={title}
          role={role}
          canViewInvoiceHistory={canViewInvoiceHistory}
        />
        <NotificationBanner />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <SyncManager businessId={businessId} />
      <OfflineRouteWarmer businessId={businessId}/>
      <OfflineNavigation/>
    </div>
  );
}
