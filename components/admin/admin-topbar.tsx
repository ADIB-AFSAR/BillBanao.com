"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogOut } from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/admin-auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Businesses" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminTopbar({ adminName }: { adminName: string }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logoutAdminAction();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-paper-line bg-ink text-paper">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-sm shrink-0">
          <span className="grid place-items-center size-7 rounded-md bg-amber text-white">
            <ShieldCheck className="size-4" />
          </span>
          <span className="hidden sm:inline">Ledger — Platform Admin</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-white/10 text-white" : "text-paper/65 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm shrink-0">
          <span className="text-paper/60 hidden lg:inline">{adminName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-paper/70 hover:text-white px-2 py-1.5 rounded-md hover:bg-white/10"
          >
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
