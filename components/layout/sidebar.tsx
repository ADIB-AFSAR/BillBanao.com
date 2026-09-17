"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Package,
  Tags,
  Users,
  History,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoice History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-ink text-paper h-screen sticky top-0 no-print">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <span className="grid place-items-center size-8 rounded-md bg-amber text-white shrink-0">
          <Receipt className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{businessName || "Your Business"}</p>
          <p className="text-[11px] text-paper/50">Billing &amp; Receipts</p>
        </div>
      </div>

      <div className="px-3 pt-4">
        <Link
          href="/billing"
          className="flex items-center gap-2 rounded-md bg-amber hover:bg-amber-dark text-white font-medium text-sm px-3 py-2.5 transition-colors shadow-sm"
        >
          <PlusCircle className="size-4" />
          New Bill
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-paper/65 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 text-[11px] text-paper/40">
        BillBanao.com · v1.0
      </div>
    </aside>
  );
}
