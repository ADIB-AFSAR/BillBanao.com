import Link from "next/link";
import { Receipt } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-paper p-10">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="grid place-items-center size-8 rounded-md bg-amber text-white">
            <Receipt className="size-4" />
          </span>
          Ledger
        </Link>
        <div className="max-w-sm">
          <p className="text-2xl font-semibold leading-snug">
            Bill customers, apply GST correctly, and keep every receipt on record.
          </p>
          <p className="mt-4 text-paper/70 text-sm leading-relaxed">
            Built for shop owners: fast product search, CGST/SGST and IGST handled
            automatically, and a receipt that prints cleanly every time.
          </p>
        </div>
        <p className="text-xs text-paper/50 tabular">INV-000241 · ₹1,062.00 · Paid</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden flex items-center gap-2 font-semibold text-lg mb-8 text-ink">
            <span className="grid place-items-center size-8 rounded-md bg-amber text-white">
              <Receipt className="size-4" />
            </span>
            Ledger
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
