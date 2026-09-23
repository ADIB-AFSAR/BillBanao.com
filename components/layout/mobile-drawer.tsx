"use client";

import { usePathname } from "next/navigation";
import { NavLink } from "./nav-link";
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Package,
  Tags,
  Users,
  History,
  Settings,
  Sparkles,
  UserCog,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  hidden?: boolean;
}

function buildNavItems(role: "OWNER" | "STAFF", canViewInvoiceHistory: boolean): NavItem[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/billing", label: "New Bill", icon: PlusCircle },
    { href: "/products", label: "Products", icon: Package },
    { href: "/categories", label: "Categories", icon: Tags },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/invoices", label: "Invoice History", icon: History, hidden: !canViewInvoiceHistory },
    { href: "/plans", label: "Plans & Billing", icon: Sparkles },
    { href: "/team", label: "Team", icon: UserCog, hidden: role !== "OWNER" },
    { href: "/settings", label: "Settings", icon: Settings, hidden: role !== "OWNER" },
  ].filter((item) => !item.hidden);
}

export function MobileDrawer({
  open,
  onClose,
  businessName,
  role,
  canViewInvoiceHistory,
}: {
  open: boolean;
  onClose: () => void;
  businessName: string;
  role: "OWNER" | "STAFF";
  canViewInvoiceHistory: boolean;
}) {
  const pathname = usePathname();
  if (!open) return null;
  const navItems = buildNavItems(role, canViewInvoiceHistory);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-ink text-paper flex flex-col shadow-xl">
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center size-8 rounded-md bg-amber text-white shrink-0">
              <Receipt className="size-4" />
            </span>
            <p className="text-sm font-semibold truncate">{businessName || "Your Business"}</p>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="p-1 text-paper/70 hover:text-white">
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-paper/65 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
