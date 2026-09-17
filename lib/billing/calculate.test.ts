import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "./calculate";
import type { InvoiceLineInput } from "./types";

function line(overrides: Partial<InvoiceLineInput> = {}): InvoiceLineInput {
  return {
    id: overrides.id ?? "line-1",
    unitPriceMinor: 10_000, // ₹100.00
    quantityMilli: 1000, // 1
    gstRateBasisPoints: 0,
    ...overrides,
  };
}

describe("calculateInvoiceTotals - no GST", () => {
  it("₹100 x 2 = ₹200", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 10_000, quantityMilli: 2000 })],
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
    });

    expect(result.subtotalMinor).toBe(20_000);
    expect(result.taxableAmountMinor).toBe(20_000);
    expect(result.gstTotalMinor).toBe(0);
    expect(result.grandTotalMinor).toBe(20_000);
  });
});

describe("calculateInvoiceTotals - GST exclusive", () => {
  it("₹100 x 2 with 18% GST -> ₹236", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({ unitPriceMinor: 10_000, quantityMilli: 2000, gstRateBasisPoints: 1800 }),
      ],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });

    expect(result.taxableAmountMinor).toBe(20_000);
    expect(result.gstTotalMinor).toBe(3_600);
    expect(result.grandTotalMinor).toBe(23_600);
    // CGST/SGST split evenly
    expect(result.cgstMinor).toBe(1_800);
    expect(result.sgstMinor).toBe(1_800);
    expect(result.igstMinor).toBe(0);
  });
});

describe("calculateInvoiceTotals - GST inclusive", () => {
  it("₹236 inclusive of 18% -> taxable ₹200, GST ₹36", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({ unitPriceMinor: 23_600, quantityMilli: 1000, gstRateBasisPoints: 1800 }),
      ],
      gstEnabled: true,
      pricesIncludeGst: true,
      taxType: "CGST_SGST",
    });

    expect(result.taxableAmountMinor).toBe(20_000);
    expect(result.gstTotalMinor).toBe(3_600);
    expect(result.grandTotalMinor).toBe(23_600);
  });

  it("does not simply subtract the percentage from the inclusive price", () => {
    // A naive (and wrong) implementation would do 236 * 0.82 = 193.52 taxable.
    // The correct tax-inclusive formula gives exactly 200.
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 23_600, gstRateBasisPoints: 1800 })],
      gstEnabled: true,
      pricesIncludeGst: true,
      taxType: "CGST_SGST",
    });
    expect(result.taxableAmountMinor).not.toBe(19_352);
    expect(result.taxableAmountMinor).toBe(20_000);
  });
});

describe("calculateInvoiceTotals - discount + GST", () => {
  it("subtotal 1000, discount 100, GST 18% -> taxable 900, GST 162, final 1062", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({ unitPriceMinor: 100_000, quantityMilli: 1000, gstRateBasisPoints: 1800 }),
      ],
      billDiscount: { type: "FIXED", value: 10_000 },
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });

    expect(result.subtotalMinor).toBe(100_000);
    expect(result.billDiscountMinor).toBe(10_000);
    expect(result.taxableAmountMinor).toBe(90_000);
    expect(result.gstTotalMinor).toBe(16_200);
    expect(result.grandTotalMinor).toBe(106_200);
  });
});

describe("calculateInvoiceTotals - CGST + SGST", () => {
  it("18% GST splits into 9% CGST + 9% SGST", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 100_000, gstRateBasisPoints: 1800 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    expect(result.cgstMinor).toBe(9_000);
    expect(result.sgstMinor).toBe(9_000);
    expect(result.igstMinor).toBe(0);
    expect(result.gstTotalMinor).toBe(18_000);
  });
});

describe("calculateInvoiceTotals - IGST", () => {
  it("18% GST goes entirely to IGST for inter-state", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 100_000, gstRateBasisPoints: 1800 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "IGST",
    });
    expect(result.cgstMinor).toBe(0);
    expect(result.sgstMinor).toBe(0);
    expect(result.igstMinor).toBe(18_000);
    expect(result.gstTotalMinor).toBe(18_000);
  });
});

describe("calculateInvoiceTotals - multiple products", () => {
  it("calculates every line correctly and sums them", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({ id: "rice", unitPriceMinor: 10_000, quantityMilli: 2000, gstRateBasisPoints: 500 }),
        line({ id: "sugar", unitPriceMinor: 5_000, quantityMilli: 3000, gstRateBasisPoints: 500 }),
        line({ id: "tshirt", unitPriceMinor: 49_900, quantityMilli: 1000, gstRateBasisPoints: 1200 }),
      ],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });

    expect(result.lines).toHaveLength(3);
    // rice: 200 subtotal, 5% gst = 10.00
    const rice = result.lines.find((l) => l.id === "rice")!;
    expect(rice.taxableAmountMinor).toBe(20_000);
    expect(rice.gstMinor).toBe(1_000);
    // sugar: 150 subtotal, 5% gst = 7.50 -> rounds to 750
    const sugar = result.lines.find((l) => l.id === "sugar")!;
    expect(sugar.taxableAmountMinor).toBe(15_000);
    expect(sugar.gstMinor).toBe(750);
    // tshirt: 499 subtotal, 12% gst = 59.88 -> rounds to 5988
    const tshirt = result.lines.find((l) => l.id === "tshirt")!;
    expect(tshirt.taxableAmountMinor).toBe(49_900);
    expect(tshirt.gstMinor).toBe(5_988);

    expect(result.subtotalMinor).toBe(20_000 + 15_000 + 49_900);
    expect(result.gstTotalMinor).toBe(1_000 + 750 + 5_988);
    expect(result.grandTotalMinor).toBe(result.taxableAmountMinor + result.gstTotalMinor);
  });
});

describe("calculateInvoiceTotals - quantity changes", () => {
  it("updates totals correctly when quantity changes", () => {
    const base = { unitPriceMinor: 25_000, gstRateBasisPoints: 1800 };
    const one = calculateInvoiceTotals({
      lines: [line({ ...base, quantityMilli: 1000 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    const three = calculateInvoiceTotals({
      lines: [line({ ...base, quantityMilli: 3000 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    expect(three.taxableAmountMinor).toBe(one.taxableAmountMinor * 3);
    expect(three.grandTotalMinor).toBe(one.grandTotalMinor * 3);
  });

  it("handles fractional quantities (e.g. 1.5 kg)", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 10_000, quantityMilli: 1500, gstRateBasisPoints: 0 })],
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
    });
    expect(result.grandTotalMinor).toBe(15_000);
  });
});

describe("calculateInvoiceTotals - rounding", () => {
  it("rounds GST consistently to the nearest paisa", () => {
    // 33.33 taxable at 18% = 5.9994 -> should round to 6.00 (600 paise)
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 3_333, gstRateBasisPoints: 1800 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    expect(result.gstTotalMinor).toBe(600);
  });

  it("rounds grand total down to the nearest rupee when under the midpoint", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 10_030, gstRateBasisPoints: 0 })], // ₹100.30
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
      roundToNearest: 100, // nearest rupee
    });
    expect(result.preRoundTotalMinor).toBe(10_030);
    expect(result.grandTotalMinor).toBe(10_000);
    expect(result.roundOffMinor).toBe(-30);
  });

  it("rounds grand total up to the nearest rupee when over the midpoint", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 10_070, gstRateBasisPoints: 0 })], // ₹100.70
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
      roundToNearest: 100,
    });
    expect(result.grandTotalMinor).toBe(10_100);
    expect(result.roundOffMinor).toBe(30);
  });

  it("proportionally allocated bill discount reconciles exactly across lines", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({ id: "a", unitPriceMinor: 3_333, gstRateBasisPoints: 1800 }),
        line({ id: "b", unitPriceMinor: 3_333, gstRateBasisPoints: 1800 }),
        line({ id: "c", unitPriceMinor: 3_334, gstRateBasisPoints: 1800 }),
      ],
      billDiscount: { type: "FIXED", value: 1_000 },
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    const sumOfLineTaxable = result.lines.reduce((a, l) => a + l.taxableAmountMinor, 0);
    expect(sumOfLineTaxable).toBe(result.taxableAmountMinor);
    expect(result.taxableAmountMinor).toBe(result.subtotalMinor - result.billDiscountMinor);
  });
});

describe("calculateInvoiceTotals - percentage discount", () => {
  it("10% off a 1000 subtotal is 100", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 100_000 })],
      billDiscount: { type: "PERCENTAGE", value: 1000 }, // 10.00%
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
    });
    expect(result.billDiscountMinor).toBe(10_000);
    expect(result.grandTotalMinor).toBe(90_000);
  });

  it("clamps a discount that would exceed the base amount", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 5_000 })],
      billDiscount: { type: "FIXED", value: 999_999 },
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
    });
    expect(result.grandTotalMinor).toBe(0);
    expect(result.billDiscountMinor).toBe(5_000);
  });
});

describe("calculateInvoiceTotals - item-level discount", () => {
  it("applies an item discount before GST", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({
          unitPriceMinor: 20_000,
          quantityMilli: 1000,
          gstRateBasisPoints: 1800,
          discount: { type: "FIXED", value: 5_000 },
        }),
      ],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    expect(result.lines[0].taxableAmountMinor).toBe(15_000);
    expect(result.lines[0].gstMinor).toBe(2_700); // 18% of 150
    expect(result.grandTotalMinor).toBe(17_700);
  });
});

describe("calculateInvoiceTotals - payment", () => {
  it("computes change when the customer overpays", () => {
    const result = calculateInvoiceTotals({
      lines: [
        line({ unitPriceMinor: 100_000, gstRateBasisPoints: 1800 }),
      ],
      billDiscount: { type: "FIXED", value: 10_000 },
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
      amountPaidMinor: 110_000, // ₹1,100 paid against a ₹1,062 total
    });
    expect(result.grandTotalMinor).toBe(106_200);
    expect(result.changeMinor).toBe(3_800);
    expect(result.amountDueMinor).toBe(0);
    expect(result.paymentStatus).toBe("PAID");
  });

  it("computes amount due on a partial payment", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 100_000 })],
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
      amountPaidMinor: 40_000,
    });
    expect(result.amountDueMinor).toBe(60_000);
    expect(result.changeMinor).toBe(0);
    expect(result.paymentStatus).toBe("PARTIALLY_PAID");
  });

  it("marks unpaid when nothing has been paid", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 100_000 })],
      gstEnabled: false,
      pricesIncludeGst: false,
      taxType: "NONE",
      amountPaidMinor: 0,
    });
    expect(result.paymentStatus).toBe("UNPAID");
  });
});

describe("calculateInvoiceTotals - defensive input handling", () => {
  it("never returns a negative taxable amount or GST", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: -500, quantityMilli: -1000, gstRateBasisPoints: -100 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    expect(result.taxableAmountMinor).toBeGreaterThanOrEqual(0);
    expect(result.gstTotalMinor).toBeGreaterThanOrEqual(0);
  });

  it("clamps a GST rate above 100% to 100%", () => {
    const result = calculateInvoiceTotals({
      lines: [line({ unitPriceMinor: 10_000, gstRateBasisPoints: 50_000 })],
      gstEnabled: true,
      pricesIncludeGst: false,
      taxType: "CGST_SGST",
    });
    expect(result.gstTotalMinor).toBe(10_000);
  });
});
