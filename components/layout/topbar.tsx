"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { clearOfflineCaches } from "@/components/pwa/sw-register";
import { MobileDrawer } from "./mobile-drawer";

export function Topbar({
  businessName,
  userName,
  title,
  role,
  canViewInvoiceHistory,
}: {
  businessName: string;
  userName: string;
  title?: string;
  role: "OWNER" | "STAFF";
  canViewInvoiceHistory: boolean;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logoutAction();
    // Drop the offline shell's cached pages so a shared/kiosk device
    // doesn't keep showing this business's data with no connection after
    // someone else signs in.
    await clearOfflineCaches();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-paper-line bg-paper/95 backdrop-blur px-4 sm:px-6 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="lg:hidden p-2 -ml-2 text-ink"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-sm font-semibold text-ink truncate">{title}</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-paper-line/60 text-sm"
          >
            <span className="grid place-items-center size-7 rounded-full bg-ink text-paper text-xs font-semibold">
              {userName.slice(0, 1).toUpperCase() || "U"}
            </span>
            <span className="hidden sm:block text-ink-2 font-medium max-w-[140px] truncate">{userName}</span>
            <ChevronDown className="size-3.5 text-slate hidden sm:block" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-md border border-paper-line bg-paper-raised shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-paper-line">
                  <p className="text-sm font-medium text-ink truncate">{userName}</p>
                  <p className="text-xs text-slate truncate">{businessName}</p>
                </div>
                {role === "OWNER" && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (typeof navigator !== "undefined" && !navigator.onLine) {
                        window.location.assign("/settings");
                      } else {
                        router.push("/settings");
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-2 hover:bg-paper"
                  >
                    <User className="size-4" /> Business settings
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brick hover:bg-brick-bg"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        businessName={businessName}
        role={role}
        canViewInvoiceHistory={canViewInvoiceHistory}
      />
    </>
  );
}
