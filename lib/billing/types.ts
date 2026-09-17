/**
 * Shared types for the billing calculation engine.
 *
 * Money: every amount is an integer number of minor currency units
 * (paise for INR). Never a float. Never a string that gets parsed with
 * parseFloat in the hot path.
 *
 * Quantity: an integer scaled by 1000 ("milli-units") so fractional
 * quantities (0.5 kg, 1.25 hours) are exact. Use `toMilliQty` / `fromMilliQty`
 * in `lib/money.ts` to convert to/from a human-entered decimal quantity.
 *
 * GST rate: an integer "basis points of a percent", i.e. percentage * 100.
 * 18% -> 1800, 5% -> 500, 2.5% -> 250. This represents fractional GST rates
 * (which do exist, e.g. 0.25% and 3% on some goods) exactly.
 */

export type DiscountType = "NONE" | "FIXED" | "PERCENTAGE";

export type TaxType = "NONE" | "CGST_SGST" | "IGST";

export interface Discount {
  type: DiscountType;
  /**
   * If type is FIXED: minor currency units.
   * If type is PERCENTAGE: basis points of a percent (10% -> 1000).
   * Ignored if type is NONE.
   */
  value: number;
}

export interface InvoiceLineInput {
  /** Stable identifier for mapping results back to UI rows. */
  id: string;
  /** Unit price in minor currency units, as entered/selected for this line. */
  unitPriceMinor: number;
  /** Quantity scaled by 1000 (see module docs). Must be > 0. */
  quantityMilli: number;
  /** GST rate that applies to this specific line item. */
  gstRateBasisPoints: number;
  /** Optional item-level discount. */
  discount?: Discount;
}

export interface InvoiceLineResult {
  id: string;
  unitPriceMinor: number;
  quantityMilli: number;
  grossAmountMinor: number; // unitPrice * qty, before any discount
  discountMinor: number; // item-level discount actually applied
  taxableAmountMinor: number; // gross - item discount - line's share of bill discount
  gstRateBasisPoints: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  gstMinor: number; // cgst + sgst + igst for this line
  totalMinor: number; // taxable + gst, i.e. what this line contributes to the grand total
}

export interface CalculateInvoiceInput {
  lines: InvoiceLineInput[];
  /** Bill-level discount, applied to the subtotal after item discounts. */
  billDiscount?: Discount;
  /** If false, no GST is calculated at all regardless of line GST rates. */
  gstEnabled: boolean;
  /**
   * If true, the unitPriceMinor on each line is treated as GST-INCLUSIVE:
   * the taxable value and GST are extracted from within that price rather
   * than added on top of it.
   */
  pricesIncludeGst: boolean;
  /** Determines CGST+SGST split vs IGST. NONE only valid when gstEnabled is false. */
  taxType: TaxType;
  /** Amount actually tendered by the customer, in minor units. Optional. */
  amountPaidMinor?: number;
  /** Round the grand total to the nearest whole currency unit (common in India). */
  roundToNearest?: number; // e.g. 100 (paise) = round to nearest rupee. Omit/0 = no rounding.
}

export interface CalculateInvoiceResult {
  lines: InvoiceLineResult[];
  /** Sum of line gross amounts, before any discount. */
  grossTotalMinor: number;
  /** Sum of item-level discounts. */
  itemDiscountTotalMinor: number;
  /** Subtotal after item-level discounts, before bill-level discount. */
  subtotalMinor: number;
  /** The bill-level discount actually applied. */
  billDiscountMinor: number;
  /** Subtotal after both item and bill discounts - the amount GST is computed on. */
  taxableAmountMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  gstTotalMinor: number;
  /** taxableAmount + gstTotal, before rounding. */
  preRoundTotalMinor: number;
  /** Rounding adjustment applied to reach grandTotalMinor (can be negative). */
  roundOffMinor: number;
  grandTotalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
  changeMinor: number;
  paymentStatus: "PAID" | "PARTIALLY_PAID" | "UNPAID";
}
