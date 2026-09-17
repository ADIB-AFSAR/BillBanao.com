import type {
  CalculateInvoiceInput,
  CalculateInvoiceResult,
  Discount,
  InvoiceLineInput,
  InvoiceLineResult,
} from "./types";

/**
 * calculateInvoiceTotals
 * ----------------------
 * The ONE authoritative place invoice totals are computed. No UI component
 * or server action should re-derive subtotal/GST/grand-total math itself -
 * they call this function and render the result.
 *
 * Calculation order (matches the spec exactly):
 *   1. line-item subtotal (unitPrice * qty)
 *   2. apply item-level discounts
 *   3. sum -> subtotal
 *   4. apply bill-level discount (allocated proportionally across lines so
 *      each line's own GST rate is respected)
 *   5. determine taxable amount
 *   6. calculate GST (CGST+SGST or IGST, per line rate)
 *   7. calculate final amount (with optional rounding to nearest currency unit)
 *   8. apply payment
 *   9. calculate amount due / change
 *
 * All amounts are integers in minor currency units - see lib/billing/types.ts.
 */
export function calculateInvoiceTotals(
  input: CalculateInvoiceInput
): CalculateInvoiceResult {
  const gstEnabled = input.gstEnabled;
  const taxType: "NONE" | "CGST_SGST" | "IGST" = gstEnabled
    ? input.taxType === "IGST"
      ? "IGST"
      : "CGST_SGST"
    : "NONE";

  // --- Step 1 & the inclusive/exclusive split -----------------------------
  // For each line, work out its gross amount and, if prices are inclusive,
  // the taxable (ex-GST) portion contained within that gross amount.
  type LineWorking = {
    id: string;
    unitPriceMinor: number;
    quantityMilli: number;
    grossAmountMinor: number; // what the customer sees as the line's sticker amount
    preDiscountTaxableMinor: number; // gross amount, or gross minus embedded GST if inclusive
    gstRateBasisPoints: number;
    itemDiscount?: Discount;
  };

  const working: LineWorking[] = input.lines.map((line) => {
    const clean = sanitizeLine(line);
    const grossAmountMinor = roundDiv(
      clean.unitPriceMinor * clean.quantityMilli,
      1000
    );

    let preDiscountTaxableMinor = grossAmountMinor;
    if (gstEnabled && input.pricesIncludeGst && clean.gstRateBasisPoints > 0) {
      preDiscountTaxableMinor = roundDiv(
        grossAmountMinor * 10_000,
        10_000 + clean.gstRateBasisPoints
      );
    }

    return {
      id: clean.id,
      unitPriceMinor: clean.unitPriceMinor,
      quantityMilli: clean.quantityMilli,
      grossAmountMinor,
      preDiscountTaxableMinor,
      gstRateBasisPoints: gstEnabled ? clean.gstRateBasisPoints : 0,
      itemDiscount: clean.discount,
    };
  });

  // --- Step 2: item-level discounts --------------------------------------
  const afterItemDiscount = working.map((line) => {
    const discountMinor = applyDiscount(
      line.itemDiscount,
      line.preDiscountTaxableMinor
    );
    return {
      ...line,
      itemDiscountMinor: discountMinor,
      taxableAfterItemDiscountMinor: line.preDiscountTaxableMinor - discountMinor,
    };
  });

  // --- Step 3: subtotal ----------------------------------------------------
  const subtotalMinor = sum(
    afterItemDiscount.map((l) => l.taxableAfterItemDiscountMinor)
  );
  const itemDiscountTotalMinor = sum(
    afterItemDiscount.map((l) => l.itemDiscountMinor)
  );
  const grossTotalMinor = sum(working.map((l) => l.grossAmountMinor));

  // --- Step 4: bill-level discount, allocated proportionally -------------
  const billDiscountMinor = applyDiscount(input.billDiscount, subtotalMinor);
  const allocations = allocateProportionally(
    afterItemDiscount.map((l) => l.taxableAfterItemDiscountMinor),
    billDiscountMinor
  );

  // --- Step 5 & 6: taxable amount + GST, per line -------------------------
  const lines: InvoiceLineResult[] = afterItemDiscount.map((line, idx) => {
    const taxableAmountMinor = Math.max(
      0,
      line.taxableAfterItemDiscountMinor - allocations[idx]
    );

    let cgstMinor = 0;
    let sgstMinor = 0;
    let igstMinor = 0;

    if (gstEnabled && line.gstRateBasisPoints > 0) {
      const totalGst = roundDiv(
        taxableAmountMinor * line.gstRateBasisPoints,
        10_000
      );
      if (taxType === "IGST") {
        igstMinor = totalGst;
      } else {
        // Split as evenly as possible; if the total GST is odd, SGST takes
        // the extra paisa so CGST + SGST always reconciles exactly.
        cgstMinor = Math.floor(totalGst / 2);
        sgstMinor = totalGst - cgstMinor;
      }
    }

    const gstMinor = cgstMinor + sgstMinor + igstMinor;

    return {
      id: line.id,
      unitPriceMinor: line.unitPriceMinor,
      quantityMilli: line.quantityMilli,
      grossAmountMinor: line.grossAmountMinor,
      discountMinor: line.itemDiscountMinor + allocations[idx],
      taxableAmountMinor,
      gstRateBasisPoints: line.gstRateBasisPoints,
      cgstMinor,
      sgstMinor,
      igstMinor,
      gstMinor,
      totalMinor: taxableAmountMinor + gstMinor,
    };
  });

  const taxableAmountMinor = sum(lines.map((l) => l.taxableAmountMinor));
  const cgstMinor = sum(lines.map((l) => l.cgstMinor));
  const sgstMinor = sum(lines.map((l) => l.sgstMinor));
  const igstMinor = sum(lines.map((l) => l.igstMinor));
  const gstTotalMinor = cgstMinor + sgstMinor + igstMinor;

  // --- Step 7: final amount, with optional rounding -----------------------
  const preRoundTotalMinor = taxableAmountMinor + gstTotalMinor;
  const grandTotalMinor = input.roundToNearest && input.roundToNearest > 1
    ? roundToNearest(preRoundTotalMinor, input.roundToNearest)
    : preRoundTotalMinor;
  const roundOffMinor = grandTotalMinor - preRoundTotalMinor;

  // --- Step 8 & 9: payment, amount due, change ----------------------------
  const amountPaidMinor = Math.max(
    0,
    Math.round(input.amountPaidMinor ?? grandTotalMinor)
  );
  const amountDueMinor = Math.max(0, grandTotalMinor - amountPaidMinor);
  const changeMinor = Math.max(0, amountPaidMinor - grandTotalMinor);

  const paymentStatus: CalculateInvoiceResult["paymentStatus"] =
    amountPaidMinor <= 0
      ? "UNPAID"
      : amountDueMinor > 0
        ? "PARTIALLY_PAID"
        : "PAID";

  return {
    lines,
    grossTotalMinor,
    itemDiscountTotalMinor,
    subtotalMinor,
    billDiscountMinor,
    taxableAmountMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    gstTotalMinor,
    preRoundTotalMinor,
    roundOffMinor,
    grandTotalMinor,
    amountPaidMinor,
    amountDueMinor,
    changeMinor,
    paymentStatus,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeLine(line: InvoiceLineInput): InvoiceLineInput {
  return {
    id: line.id,
    unitPriceMinor: Math.max(0, Math.round(line.unitPriceMinor)),
    quantityMilli: Math.max(0, Math.round(line.quantityMilli)),
    gstRateBasisPoints: clamp(Math.round(line.gstRateBasisPoints), 0, 10_000),
    discount: line.discount,
  };
}

/** Applies a discount to a base amount, clamped so it never exceeds the base. */
function applyDiscount(discount: Discount | undefined, baseMinor: number): number {
  if (!discount || discount.type === "NONE" || baseMinor <= 0) return 0;
  if (discount.type === "FIXED") {
    return clamp(Math.round(discount.value), 0, baseMinor);
  }
  // PERCENTAGE - value is basis points of a percent (10% -> 1000)
  const pct = clamp(Math.round(discount.value), 0, 10_000);
  return clamp(roundDiv(baseMinor * pct, 10_000), 0, baseMinor);
}

/**
 * Splits `totalToAllocate` across `weights` in proportion to each weight,
 * guaranteeing the parts sum EXACTLY to totalToAllocate (the common
 * "largest remainder" approach) rather than drifting from rounding.
 */
function allocateProportionally(weights: number[], totalToAllocate: number): number[] {
  const weightSum = sum(weights);
  if (totalToAllocate <= 0 || weightSum <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (w / weightSum) * totalToAllocate);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = totalToAllocate - sum(floors);

  // Distribute the leftover paise to the lines with the largest fractional
  // remainder first, so the total always reconciles exactly.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k].i] += 1;
    remainder--;
  }
  return result;
}

function roundDiv(numerator: number, denominator: number): number {
  return Math.round(numerator / denominator);
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
