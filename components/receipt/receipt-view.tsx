import { formatMoney, formatMoneyPlain, formatPercent, formatQty, UNIT_LABELS } from "@/lib/money";

export interface ReceiptData {
  invoiceNumber: string;
  invoiceDate: Date;
  customerNameSnapshot: string | null;
  gstApplied: boolean;
  taxType: string;
  subtotalMinor: number;
  billDiscountMinor: number;
  taxableAmountMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  gstTotalMinor: number;
  roundOffMinor: number;
  grandTotalMinor: number;
  paymentMethod: string;
  paymentStatus: string;
  amountPaidMinor: number;
  amountDueMinor: number;
  changeMinor: number;
  notes: string | null;
  items: Array<{
    productNameSnapshot: string;
    skuSnapshot: string | null;
    unitSnapshot: string;
    unitPriceMinor: number;
    quantityMilli: number;
    lineDiscountMinor: number;
    gstRateBasisPoints: number;
    lineTotalMinor: number;
  }>;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    gstin: string | null;
  } | null;
  business: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    logoUrl: string | null;
    settings: {
      receiptFooter: string | null;
      termsAndConditions: string | null;
      currency: string;
    } | null;
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  UNPAID: "Unpaid",
};

export function ReceiptView({ invoice }: { invoice: ReceiptData }) {
  const currency = invoice.business.settings?.currency ?? "INR";

  return (
    <div className="print-receipt mx-auto max-w-2xl bg-white text-ink border border-paper-line rounded-lg shadow-sm p-6 sm:p-10 print:shadow-none print:border-0 print:max-w-none">
      <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-dashed border-paper-line-2">
        <div>
          {invoice.business.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invoice.business.logoUrl} alt={invoice.business.name} className="h-10 mb-2 object-contain" />
          )}
          <h1 className="text-lg font-bold text-ink">{invoice.business.name}</h1>
          {invoice.business.address && <p className="text-xs text-slate mt-0.5 max-w-xs">{invoice.business.address}</p>}
          <p className="text-xs text-slate">
            {[invoice.business.phone, invoice.business.email].filter(Boolean).join(" · ")}
          </p>
          {invoice.business.gstin && <p className="text-xs text-slate mt-0.5">GSTIN: {invoice.business.gstin}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wide text-slate">Invoice</p>
          <p className="text-base font-bold tabular text-ink">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate mt-1 tabular">
            {new Date(invoice.invoiceDate).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      </div>

      <div className="py-4 border-b border-paper-line">
        <p className="text-xs uppercase tracking-wide text-slate mb-1">Billed to</p>
        <p className="text-sm font-medium text-ink">{invoice.customer?.name ?? invoice.customerNameSnapshot ?? "Walk-in Customer"}</p>
        {invoice.customer?.address && <p className="text-xs text-slate">{invoice.customer.address}</p>}
        <p className="text-xs text-slate">
          {[invoice.customer?.phone, invoice.customer?.email].filter(Boolean).join(" · ")}
        </p>
        {invoice.customer?.gstin && <p className="text-xs text-slate">GSTIN: {invoice.customer.gstin}</p>}
      </div>

      <table className="w-full text-sm my-4">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-paper-line">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">Rate</th>
            {invoice.gstApplied && <th className="py-2 font-medium text-right">GST</th>}
            <th className="py-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={idx} className="border-b border-paper-line/70 last:border-0">
              <td className="py-2 pr-2">
                <p className="text-ink">{item.productNameSnapshot}</p>
                {item.skuSnapshot && <p className="text-[11px] text-slate tabular">{item.skuSnapshot}</p>}
              </td>
              <td className="py-2 text-right tabular text-ink-2">
                {formatQty(item.quantityMilli)} {UNIT_LABELS[item.unitSnapshot]}
              </td>
              <td className="py-2 text-right tabular text-ink-2">{formatMoneyPlain(item.unitPriceMinor, currency)}</td>
              {invoice.gstApplied && (
                <td className="py-2 text-right tabular text-ink-2">{formatPercent(item.gstRateBasisPoints)}</td>
              )}
              <td className="py-2 text-right tabular font-medium text-ink">
                {formatMoneyPlain(item.lineTotalMinor, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-full sm:w-64 text-sm space-y-1">
          <SummaryRow label="Subtotal" value={formatMoney(invoice.subtotalMinor, currency)} />
          {invoice.billDiscountMinor > 0 && (
            <SummaryRow label="Discount" value={`- ${formatMoney(invoice.billDiscountMinor, currency)}`} />
          )}
          <SummaryRow label="Taxable Amount" value={formatMoney(invoice.taxableAmountMinor, currency)} />
          {invoice.gstApplied && invoice.taxType === "CGST_SGST" && (
            <>
              <SummaryRow label="CGST" value={formatMoney(invoice.cgstMinor, currency)} />
              <SummaryRow label="SGST" value={formatMoney(invoice.sgstMinor, currency)} />
            </>
          )}
          {invoice.gstApplied && invoice.taxType === "IGST" && (
            <SummaryRow label="IGST" value={formatMoney(invoice.igstMinor, currency)} />
          )}
          {invoice.roundOffMinor !== 0 && (
            <SummaryRow
              label="Round off"
              value={`${invoice.roundOffMinor > 0 ? "+" : ""}${formatMoney(invoice.roundOffMinor, currency)}`}
            />
          )}
          <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-dashed border-paper-line-2">
            <span className="font-bold text-ink">Grand Total</span>
            <span className="font-bold text-lg tabular text-ink">{formatMoney(invoice.grandTotalMinor, currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-paper-line grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate mb-1">Payment</p>
          <p className="text-ink-2">
            {PAYMENT_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod} · {STATUS_LABELS[invoice.paymentStatus]}
          </p>
          <p className="text-xs text-slate tabular mt-0.5">Paid: {formatMoney(invoice.amountPaidMinor, currency)}</p>
          {invoice.amountDueMinor > 0 && (
            <p className="text-xs text-brick tabular mt-0.5 font-medium">
              Due: {formatMoney(invoice.amountDueMinor, currency)}
            </p>
          )}
          {invoice.changeMinor > 0 && (
            <p className="text-xs text-moss tabular mt-0.5 font-medium">
              Change: {formatMoney(invoice.changeMinor, currency)}
            </p>
          )}
        </div>
        {invoice.business.settings?.termsAndConditions && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate mb-1">Terms &amp; Conditions</p>
            <p className="text-xs text-slate whitespace-pre-line">{invoice.business.settings.termsAndConditions}</p>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div className="mt-4 pt-3 border-t border-paper-line">
          <p className="text-xs uppercase tracking-wide text-slate mb-1">Notes</p>
          <p className="text-xs text-slate whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}

      <p className="text-center text-sm text-ink-2 font-medium mt-8 pt-4 border-t-2 border-dashed border-paper-line-2">
        {invoice.business.settings?.receiptFooter || "Thank you for your business!"}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate">{label}</span>
      <span className="tabular text-ink-2">{value}</span>
    </div>
  );
}
