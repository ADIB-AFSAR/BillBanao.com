/**
 * Reusable currency + unit helpers. Nothing else in the app should format
 * money or parse quantities by hand - route it through here so adding a
 * new currency later is a one-file change.
 */

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  /** How many minor units make one major unit (100 for paise/cents). */
  minorUnitFactor: number;
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyDefinition> = {
  INR: { code: "INR", symbol: "\u20B9", minorUnitFactor: 100, locale: "en-IN" },
  USD: { code: "USD", symbol: "$", minorUnitFactor: 100, locale: "en-US" },
  EUR: { code: "EUR", symbol: "\u20AC", minorUnitFactor: 100, locale: "en-IE" },
  GBP: { code: "GBP", symbol: "\u00A3", minorUnitFactor: 100, locale: "en-GB" },
};

export const DEFAULT_CURRENCY = "INR";

/** Formats an integer minor-unit amount as a display string, e.g. 106200 -> "₹1,062.00". */
export function formatMoney(minorAmount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const major = minorAmount / currency.minorUnitFactor;
  const formatted = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${currency.symbol}${formatted}`;
}

/** Formats without the currency symbol, e.g. 106200 -> "1,062.00" - useful in table cells with a shared header symbol. */
export function formatMoneyPlain(minorAmount: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  const major = minorAmount / currency.minorUnitFactor;
  return new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/** Converts a human-entered decimal amount (e.g. from a form, "199.50") into minor units. */
export function toMinorUnits(majorAmount: number, currencyCode: string = DEFAULT_CURRENCY): number {
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  return Math.round(majorAmount * currency.minorUnitFactor);
}

export function fromMinorUnits(minorAmount: number, currencyCode: string = DEFAULT_CURRENCY): number {
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES[DEFAULT_CURRENCY];
  return minorAmount / currency.minorUnitFactor;
}

/** Converts a human-entered decimal quantity (e.g. "1.5" kg) into milli-units (1500). */
export function toMilliQty(quantity: number): number {
  return Math.round(quantity * 1000);
}

export function fromMilliQty(quantityMilli: number): number {
  return quantityMilli / 1000;
}

/** Formats a milli-quantity back to a clean decimal string, trimming trailing zeros: 2000 -> "2", 1500 -> "1.5". */
export function formatQty(quantityMilli: number): string {
  const value = quantityMilli / 1000;
  return value % 1 === 0 ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/** Converts a percentage (e.g. 18, or 2.5) into basis points (1800, 250) for storage. */
export function toBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

export function fromBasisPoints(basisPoints: number): number {
  return basisPoints / 100;
}

export function formatPercent(basisPoints: number): string {
  const pct = fromBasisPoints(basisPoints);
  return `${pct % 1 === 0 ? pct : pct.toFixed(2)}%`;
}

export const GST_RATE_PRESETS = [0, 5, 12, 18, 28];

export const UNIT_LABELS: Record<string, string> = {
  PIECE: "Piece",
  KG: "Kg",
  GRAM: "Gram",
  LITER: "Liter",
  METER: "Meter",
  BOX: "Box",
  PACKET: "Packet",
  DOZEN: "Dozen",
  HOUR: "Hour",
  SERVICE: "Service",
};

export const UNIT_ALLOWS_FRACTIONAL: Record<string, boolean> = {
  PIECE: false,
  KG: true,
  GRAM: true,
  LITER: true,
  METER: true,
  BOX: false,
  PACKET: false,
  DOZEN: false,
  HOUR: true,
  SERVICE: true,
};
