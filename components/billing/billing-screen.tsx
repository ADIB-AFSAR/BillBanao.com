"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Receipt } from "lucide-react";
import { calculateInvoiceTotals } from "@/lib/billing/calculate";
import type { Discount, InvoiceLineInput, TaxType } from "@/lib/billing/types";
import { formatMoney, toMilliQty } from "@/lib/money";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { ProductSearchPanel, type BillingProduct } from "./product-search-panel";
import { CartRow } from "./cart-row";
import { CustomerPicker, type BillingCustomer } from "./customer-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/primitives";

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  unit: string;
  unitPriceMinor: number;
  unitPriceOverride?: number; // rupees
  quantity: number; // human decimal
  gstRateBasisPoints: number;
  discountValue?: number; // rupees, item-level fixed discount
}

interface BillingSettings {
  gstEnabledByDefault: boolean;
  pricesIncludeGst: boolean;
  billLevelDiscountEnabled: boolean;
  itemLevelDiscountEnabled: boolean;
  allowManualPriceOverride: boolean;
  currency: string;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
] as const;

export function BillingScreen({
  settings,
  businessState,
  prefillItems,
}: {
  settings: BillingSettings;
  businessState: string | null;
  prefillItems?: CartItem[];
}) {
  const router = useRouter();
  const [summaryHeight, setSummaryHeight] = useState(370);
  const [cart, setCart] = useState<CartItem[]>(prefillItems ?? []);
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [gstEnabled, setGstEnabled] = useState(settings.gstEnabledByDefault);
  const [billDiscountType, setBillDiscountType] = useState<"NONE" | "FIXED" | "PERCENTAGE">("NONE");
  const [billDiscountValue, setBillDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("CASH");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [amountPaidTouched, setAmountPaidTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (prefillItems && prefillItems.length > 0) {
      toast.info("Bill prefilled from a previous invoice. Review quantities and prices before checkout.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSummaryDragStart(e: React.PointerEvent<HTMLDivElement>) {
  e.currentTarget.setPointerCapture(e.pointerId);

  const startY = e.clientY;
  const startHeight = summaryHeight;

  const handleMove = (event: PointerEvent) => {
    // Dragging down makes summary smaller.
    // Dragging up makes summary larger.
    const delta = event.clientY - startY;

    const nextHeight = Math.min(
      520,
      Math.max(260, startHeight - delta)
    );

    setSummaryHeight(nextHeight);
  };

  const handleUp = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
}

  function addProduct(p: BillingProduct) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id && c.unitPriceOverride == null);
      if (existing) {
        return prev.map((c) => (c.key === existing.key ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          key: `${p.id}-${Date.now()}`,
          productId: p.id,
          name: p.name,
          unit: p.unit,
          unitPriceMinor: p.unitPriceMinor,
          quantity: 1,
          gstRateBasisPoints: p.gstRateBasisPoints,
        },
      ];
    });
  }

  function updateItem(key: string, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function removeItem(key: string) {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }

  const taxType: TaxType = useMemo(() => {
    if (!businessState || !customer?.state) return "CGST_SGST";
    return businessState.trim().toLowerCase() === customer.state.trim().toLowerCase() ? "CGST_SGST" : "IGST";
  }, [businessState, customer]);
  const lines: InvoiceLineInput[] = useMemo(
    () =>
      cart.map((item) => {
        const discount: Discount | undefined = item.discountValue
          ? { type: "FIXED", value: Math.round(item.discountValue * 100) }
          : undefined;
        return {
          id: item.key,
          unitPriceMinor:
            item.unitPriceOverride != null ? Math.round(item.unitPriceOverride * 100) : item.unitPriceMinor,
          quantityMilli: toMilliQty(item.quantity),
          gstRateBasisPoints: item.gstRateBasisPoints,
          discount,
        };
      }),
    [cart]
  );

  const billDiscount: Discount | undefined = useMemo(
    () =>
      billDiscountType !== "NONE" && billDiscountValue > 0
        ? { type: billDiscountType, value: Math.round(billDiscountValue * 100) }
        : undefined,
    [billDiscountType, billDiscountValue]
  );

  const amountPaidMinor = amountPaidTouched && amountPaidInput !== "" ? Math.round(parseFloat(amountPaidInput) * 100) : undefined;

  const totals = useMemo(
    () =>
      calculateInvoiceTotals({
        lines,
        billDiscount,
        gstEnabled,
        pricesIncludeGst: settings.pricesIncludeGst,
        taxType,
        amountPaidMinor,
      }),
    [lines, billDiscount, gstEnabled, settings.pricesIncludeGst, taxType, amountPaidMinor]
  );

  const effectiveAmountPaidDisplay = amountPaidTouched ? amountPaidInput : (totals.grandTotalMinor / 100).toFixed(2);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    const result = await createInvoiceAction({
      customerId: customer?.id || "",
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceOverride: item.unitPriceOverride,
        discount: item.discountValue ? { type: "FIXED" as const, value: item.discountValue } : undefined,
      })),
      billDiscount:
        billDiscountType !== "NONE" && billDiscountValue > 0
          ? { type: billDiscountType, value: billDiscountValue }
          : undefined,
      gstEnabled,
      customerState: customer?.state || "",
      paymentMethod,
      amountPaid: totals.amountPaidMinor / 100,
      notes,
    });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Invoice ${result.data.invoiceNumber} saved.`);
    router.push(`/invoices/${result.data.id}`);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_400px] h-[calc(100vh-3.5rem)]">
      <div className="overflow-y-auto p-4 sm:p-6 border-r border-paper-line">
        <ProductSearchPanel onAdd={addProduct} />
      </div>

      <div className="flex flex-col bg-paper-raised overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-paper-line flex items-center gap-2">
          <ShoppingCart className="size-4 text-ink-2" />
          <h2 className="text-sm font-semibold text-ink">Current Bill</h2>
          <span className="ml-auto text-xs text-slate">{cart.length} item{cart.length === 1 ? "" : "s"}</span>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-paper-line">
          <CustomerPicker selected={customer} onSelect={setCustomer} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5">
          {cart.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="size-8 text-slate/40 mx-auto mb-2" />
              <p className="text-sm text-slate">Search and add products to start a bill.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <CartRow
                key={item.key}
                item={item}
                lineTotalMinor={totals.lines[idx]?.totalMinor ?? 0}
                allowPriceOverride={settings.allowManualPriceOverride}
                itemDiscountEnabled={settings.itemLevelDiscountEnabled}
                onChange={(patch) => updateItem(item.key, patch)}
                onRemove={() => removeItem(item.key)}
              />
            ))
          )}
        </div>

         <div
    onPointerDown={handleSummaryDragStart}
    className="h-6 shrink-0 border-t border-paper-line bg-paper flex items-center justify-center cursor-row-resize touch-none"
    aria-label="Resize bill summary"
    role="separator"
    aria-orientation="horizontal"
  >
    <div className="w-10 h-1 rounded-full bg-slate/40" />
  </div>

  {/* Checkout summary */}
  <div
    className="shrink-0 overflow-y-auto px-4 sm:px-5 py-3 space-y-3 bg-paper"
    style={{ height: summaryHeight }}
  >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <span
                onClick={() => setGstEnabled((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  gstEnabled ? "bg-amber" : "bg-paper-line-2"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    gstEnabled ? "translate-x-4.5" : "translate-x-1"
                  }`}
                />
              </span>
              Apply GST
            </label>
            {gstEnabled && (
              <span className="text-xs text-slate">{taxType === "IGST" ? "IGST (inter-state)" : "CGST + SGST"}</span>
            )}
          </div>

          {settings.billLevelDiscountEnabled && (
            <div className="flex gap-2">
              <Select
                value={billDiscountType}
                onChange={(e) => setBillDiscountType(e.target.value as typeof billDiscountType)}
                className="w-32 h-9 text-xs"
              >
                <option value="NONE">No discount</option>
                <option value="FIXED">Discount ₹</option>
                <option value="PERCENTAGE">Discount %</option>
              </Select>
              {billDiscountType !== "NONE" && (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={billDiscountValue || ""}
                  onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="flex-1 h-9 rounded-md border border-paper-line-2 px-2 text-sm tabular"
                />
              )}
            </div>
          )}

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note for this bill (optional)"
            className="w-full h-9 rounded-md border border-paper-line-2 px-2 text-sm"
          />

          <dl className="text-sm space-y-1">            <Row label="Subtotal" value={formatMoney(totals.subtotalMinor)} />
            {totals.billDiscountMinor > 0 && (
              <Row label="Bill discount" value={`- ${formatMoney(totals.billDiscountMinor)}`} muted />
            )}
            <Row label="Taxable amount" value={formatMoney(totals.taxableAmountMinor)} />
            {gstEnabled && taxType === "CGST_SGST" && totals.cgstMinor > 0 && (
              <>
                <Row label="CGST" value={formatMoney(totals.cgstMinor)} muted />
                <Row label="SGST" value={formatMoney(totals.sgstMinor)} muted />
              </>
            )}
            {gstEnabled && totals.igstMinor > 0 && <Row label="IGST" value={formatMoney(totals.igstMinor)} muted />}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-paper-line">
              <dt className="font-semibold text-ink">Grand Total</dt>
              <dd className="font-bold text-lg text-ink tabular">{formatMoney(totals.grandTotalMinor)}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="h-9 text-xs"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <input
              type="number"
              step="0.01"
              min={0}
              value={effectiveAmountPaidDisplay}
              onChange={(e) => {
                setAmountPaidTouched(true);
                setAmountPaidInput(e.target.value);
              }}
              placeholder="Amount paid"
              className="h-9 rounded-md border border-paper-line-2 px-2 text-sm tabular"
              aria-label="Amount paid"
            />
          </div>
          {totals.changeMinor > 0 && (
            <p className="text-xs text-moss font-medium">Change due: {formatMoney(totals.changeMinor)}</p>
          )}
          {totals.amountDueMinor > 0 && (
            <p className="text-xs text-brick font-medium">Amount due: {formatMoney(totals.amountDueMinor)}</p>
          )}

          <Button
            className="w-full h-11 text-base"
            variant="amber"
            disabled={cart.length === 0}
            loading={submitting}
            onClick={handleCheckout}
          >
            Complete Sale · {formatMoney(totals.grandTotalMinor)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-slate" : "text-ink-2"}>{label}</dt>
      <dd className={`tabular ${muted ? "text-slate" : "text-ink-2 font-medium"}`}>{value}</dd>
    </div>
  );
}
