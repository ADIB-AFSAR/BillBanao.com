"use client";

import { useRouter } from "next/navigation";
import { Printer, Copy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptActions({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();

  return (
    <div className="no-print flex flex-wrap items-center gap-2 mb-4 max-w-2xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => router.push("/invoices")}>
        <ArrowLeft className="size-4" /> Back to history
      </Button>
      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={() => router.push(`/billing?duplicate=${invoiceId}`)}>
        <Copy className="size-4" /> Duplicate invoice
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="size-4" /> Print / Save as PDF
      </Button>
    </div>
  );
}
