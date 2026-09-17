import { notFound } from "next/navigation";
import { getInvoiceAction } from "@/lib/actions/invoices";
import { ReceiptView } from "@/components/receipt/receipt-view";
import { ReceiptActions } from "@/components/receipt/receipt-actions";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getInvoiceAction(id);
  if (!result.ok) notFound();
  const invoice = result.data;

  return (
    <div className="p-4 sm:p-8 bg-paper min-h-full">
      <ReceiptActions invoiceId={invoice.id} />
      <ReceiptView invoice={invoice} />
    </div>
  );
}
