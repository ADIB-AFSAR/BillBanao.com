"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Receipt, WifiOff, X, Printer } from "lucide-react";
import { calculateInvoiceTotals } from "@/lib/billing/calculate";
import type { Discount, InvoiceLineInput, TaxType } from "@/lib/billing/types";
import { formatMoney, toMilliQty } from "@/lib/money";
import type { CreateInvoiceInput } from "@/schemas/invoice";
import { listAllProductsForCacheAction } from "@/lib/actions/products";
import { listAllCustomersForCacheAction } from "@/lib/actions/customers";
import { ProductSearchPanel, type BillingProduct } from "./product-search-panel";
import { CartRow } from "./cart-row";
import { CustomerPicker, type BillingCustomer } from "./customer-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/primitives";
import { ReceiptView, type ReceiptData } from "@/components/receipt/receipt-view";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createInvoiceOnlineOrQueue } from "@/lib/offline/outbox";
import { warmProductCache, warmCustomerCache, saveCachedBusinessInfo, decrementCachedStock } from "@/lib/offline/cache";
import type { CachedBusinessInfo } from "@/lib/offline/db";
import { createPortal } from "react-dom";

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
  businessId,
  businessInfo,
  settings,
  businessState,
  prefillItems,
}: {
  businessId: string;
  businessInfo: CachedBusinessInfo;
  settings: BillingSettings;
  businessState: string | null;
  prefillItems?: CartItem[];
}) {
  const router = useRouter();
  const online = useOnlineStatus();
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
  const [offlineReceipt, setOfflineReceipt] = useState<ReceiptData | null>(null);
  const draftKey = `billing-draft-${businessId}`;

  useEffect(() => {
  if (prefillItems?.length) return;

  const saved = sessionStorage.getItem(draftKey);
  if (!saved) return;

  try {
    const draft = JSON.parse(saved);

    setCart(draft.cart ?? []);
    setCustomer(draft.customer ?? null);
    setGstEnabled(draft.gstEnabled ?? settings.gstEnabledByDefault);
    setBillDiscountType(draft.billDiscountType ?? "NONE");
    setBillDiscountValue(draft.billDiscountValue ?? 0);
    setPaymentMethod(draft.paymentMethod ?? "CASH");
    setAmountPaidInput(draft.amountPaidInput ?? "");
    setAmountPaidTouched(draft.amountPaidTouched ?? false);
    setNotes(draft.notes ?? "");
  } catch {
    sessionStorage.removeItem(draftKey);
  }
}, [draftKey, prefillItems, settings.gstEnabledByDefault]);

useEffect(() => {
  if (cart.length === 0) {
    sessionStorage.removeItem(draftKey);
    return;
  }

  sessionStorage.setItem(
    draftKey,
    JSON.stringify({
      cart,
      customer,
      gstEnabled,
      billDiscountType,
      billDiscountValue,
      paymentMethod,
      amountPaidInput,
      amountPaidTouched,
      notes,
    })
  );
}, [
  draftKey,
  cart,
  customer,
  gstEnabled,
  billDiscountType,
  billDiscountValue,
  paymentMethod,
  amountPaidInput,
  amountPaidTouched,
  notes,
]);

  useEffect(() => {
    if (prefillItems && prefillItems.length > 0) {
      toast.info("Bill prefilled from a previous invoice. Review quantities and prices before checkout.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the offline cache in the background whenever the billing screen
  // loads with a connection - this is what makes product search and
  // customer lookup keep working later if the connection drops mid-shift.
  useEffect(() => {
    if (!navigator.onLine) return;
    let cancelled = false;
    (async () => {
      const [products, customers] = await Promise.all([
        listAllProductsForCacheAction(),
        listAllCustomersForCacheAction(),
      ]);
      if (cancelled) return;
      if (products.ok) await warmProductCache(businessId, products.data as unknown as never[]);
      if (customers.ok) await warmCustomerCache(businessId, customers.data as unknown as never[]);
      // businessInfo is a prop, not something this effect fetched - if the
      // page's own server-side business lookup failed (DB hiccup) it will
      // be the blank fallback, and saving that here would overwrite a
      // perfectly good cached copy from an earlier, successful visit.
      if (businessInfo.name) await saveCachedBusinessInfo(businessId, businessInfo);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

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

  function buildReceiptSnapshot(clientInvoiceLabel: string): ReceiptData {
    return {
      invoiceNumber: clientInvoiceLabel,
      invoiceDate: new Date(),
      customerNameSnapshot: customer?.name ?? "Walk-in Customer",
      gstApplied: gstEnabled,
      taxType,
      subtotalMinor: totals.subtotalMinor,
      billDiscountMinor: totals.billDiscountMinor,
      taxableAmountMinor: totals.taxableAmountMinor,
      cgstMinor: totals.cgstMinor,
      sgstMinor: totals.sgstMinor,
      igstMinor: totals.igstMinor,
      gstTotalMinor: totals.gstTotalMinor,
      roundOffMinor: totals.roundOffMinor,
      grandTotalMinor: totals.grandTotalMinor,
      paymentMethod,
      paymentStatus: totals.paymentStatus,
      amountPaidMinor: totals.amountPaidMinor,
      amountDueMinor: totals.amountDueMinor,
      changeMinor: totals.changeMinor,
      notes: notes || null,
      items: totals.lines.map((line, idx) => ({
        productNameSnapshot: cart[idx]?.name ?? "Item",
        skuSnapshot: null,
        unitSnapshot: cart[idx]?.unit ?? "PIECE",
        unitPriceMinor: line.unitPriceMinor,
        quantityMilli: line.quantityMilli,
        lineDiscountMinor: line.discountMinor,
        gstRateBasisPoints: line.gstRateBasisPoints,
        lineTotalMinor: line.totalMinor,
      })),
      customer: customer ? { name: customer.name, phone: customer.phone, email: null, address: null, gstin: null } : null,
      business: {
        name: businessInfo.name,
        address: businessInfo.address,
        phone: businessInfo.phone,
        email: businessInfo.email,
        gstin: businessInfo.gstin,
        logoUrl: businessInfo.logoUrl,
        settings: {
          receiptFooter: businessInfo.receiptFooter,
          termsAndConditions: businessInfo.termsAndConditions,
          currency: businessInfo.currency,
        },
      },
    };
  }

  function resetBill() {
    setCart([]);
    setCustomer(null);
    setNotes("");
    setAmountPaidTouched(false);
    setAmountPaidInput("");
    setBillDiscountType("NONE");
    setBillDiscountValue(0);
    sessionStorage.removeItem(draftKey);
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);

    const payload: CreateInvoiceInput = {
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
    };

    try {
      const outcome = await createInvoiceOnlineOrQueue(businessId, payload, buildReceiptSnapshot);

      if (outcome.mode === "online") {
        if (!outcome.result.ok) {
          toast.error(outcome.result.error);
          return;
        }
        toast.success(`Invoice ${outcome.result.data.invoiceNumber} saved.`);
        resetBill();
        router.push(`/invoices/${outcome.result.data.id}`);
        return;
      }

      // Queued for later sync - decrement local stock so a second offline
      // sale on this device doesn't oversell the same cached quantity.
      await Promise.all(cart.map((item) => decrementCachedStock(businessId, item.productId, item.quantity)));
      toast.success(`Saved offline as ${outcome.receipt.invoiceNumber} - it'll sync automatically once you're back online.`);
      setOfflineReceipt(outcome.receipt);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <div className="grid lg:grid-cols-[1fr_400px] h-[calc(100vh-3.5rem)]">
      <div className="overflow-y-auto p-4 sm:p-6 border-r border-paper-line">
        <ProductSearchPanel businessId={businessId} onAdd={addProduct} />
      </div>

      <div className="flex flex-col bg-paper-raised min-h-0 overflow-y-auto">
        <div className="px-4 sm:px-5 py-3 border-b border-paper-line flex items-center gap-2">
          <ShoppingCart className="size-4 text-ink-2" />
          <h2 className="text-sm font-semibold text-ink">Current Bill</h2>
          <span className="ml-auto text-xs text-slate">{cart.length} item{cart.length === 1 ? "" : "s"}</span>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-paper-line">
          <CustomerPicker businessId={businessId} selected={customer} onSelect={setCustomer} />
        </div>

        <div className="px-4 sm:px-5">
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

        <div className="border-t border-paper-line px-4 sm:px-5 py-3 space-y-3 bg-paper">
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

          <dl className="text-sm space-y-1">
            <Row label="Subtotal" value={formatMoney(totals.subtotalMinor)} />
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

          {!online && (
            <p className="flex items-center gap-1.5 text-xs text-amber-dark font-medium">
              <WifiOff className="size-3.5" /> You&apos;re offline - this bill will save locally and sync automatically.
            </p>
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
    {offlineReceipt &&
  createPortal(
    <div className="fixed inset-0 z-[99999] bg-ink/40 overflow-y-auto">
      <div className="min-h-full px-4 pb-8">
        <div className="w-full max-w-2xl mx-auto pt-4">
          
          <div className="flex justify-end gap-2 mb-3 print:hidden">
            <Button
              variant="outline"
              onClick={() => setOfflineReceipt(null)}
            >
              <X className="size-4" />
              Close
            </Button>

            <Button onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>

          <ReceiptView invoice={offlineReceipt} />
        </div>
      </div>
    </div>,
    document.body
  )}
    </>
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
