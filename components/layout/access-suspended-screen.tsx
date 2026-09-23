"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { clearOfflineCaches } from "@/components/pwa/sw-register";

export function AccessSuspendedScreen({
  businessName,
  status,
}: {
  businessName: string;
  status: "PAST_DUE" | "SUSPENDED";
}) {
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    await clearOfflineCaches();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-paper p-6">
      <div className="max-w-sm w-full text-center">
        <span className="grid place-items-center size-12 rounded-full bg-brick-bg text-brick mx-auto mb-4">
          <LockKeyhole className="size-5" />
        </span>
        <h1 className="text-lg font-semibold text-ink">Access paused for {businessName}</h1>
        <p className="text-sm text-slate mt-2">
          {status === "PAST_DUE"
            ? "Your free trial has ended or a payment is past due. Billing and other features are paused until it's resolved."
            : "This account has been suspended. Billing and other features are paused."}
        </p>
        <p className="text-sm text-slate mt-2">
          Please contact whoever manages your Ledger subscription to resume access. Your data is
          safe and nothing has been deleted.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <a
            href="/plans"
            className="h-10 px-5 grid place-items-center rounded-md bg-amber text-white text-sm font-medium hover:bg-amber-dark"
          >
            View plans
          </a>
          <button
            onClick={handleLogout}
            className="h-10 px-5 rounded-md border border-paper-line-2 text-sm font-medium text-ink hover:bg-paper-raised"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
