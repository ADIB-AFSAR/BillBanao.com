"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney, UNIT_LABELS, UNIT_ALLOWS_FRACTIONAL, formatPercent } from "@/lib/money";
import type { CartItem } from "./billing-screen";

export function CartRow({
  item,
  lineTotalMinor,
  allowPriceOverride,
  itemDiscountEnabled,
  onChange,
  onRemove,
}: {
  item: CartItem;
  lineTotalMinor: number;
  allowPriceOverride: boolean;
  itemDiscountEnabled: boolean;
  onChange: (patch: Partial<CartItem>) => void;
  onRemove: () => void;
}) {
  const fractional = UNIT_ALLOWS_FRACTIONAL[item.unit];
  const step = fractional ? 0.5 : 1;

  function setQuantity(next: number) {
    const clamped = Math.max(fractional ? 0.01 : 1, next);
    onChange({ quantity: fractional ? Math.round(clamped * 100) / 100 : Math.round(clamped) });
  }

  return (
    <div className="py-3 border-b border-paper-line last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{item.name}</p>
          <p className="text-xs text-slate tabular">
            {formatMoney(item.unitPriceMinor)} / {UNIT_LABELS[item.unit]}
            {item.gstRateBasisPoints > 0 && <> · GST {formatPercent(item.gstRateBasisPoints)}</>}
          </p>
        </div>
        <button onClick={onRemove} className="text-slate hover:text-brick p-1 shrink-0" aria-label={`Remove ${item.name}`}>
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 gap-3">
        <div className="flex items-center border border-paper-line-2 rounded-md">
          <button
            className="p-1.5 text-ink-2 hover:bg-paper"
            onClick={() => setQuantity(item.quantity - step)}
            aria-label="Decrease quantity"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="number"
            step={fractional ? 0.01 : 1}
            min={fractional ? 0.01 : 1}
            value={item.quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
            className="w-14 text-center text-sm tabular border-0 focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            className="p-1.5 text-ink-2 hover:bg-paper"
            onClick={() => setQuantity(item.quantity + step)}
            aria-label="Increase quantity"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <p className="text-sm font-semibold text-ink tabular">{formatMoney(lineTotalMinor)}</p>
      </div>

      {(allowPriceOverride || itemDiscountEnabled) && (
        <div className="flex gap-2 mt-2">
          {allowPriceOverride && (
            <label className="flex-1 text-xs text-slate">
              Price override
              <input
                type="number"
                step="0.01"
                placeholder={String(item.unitPriceMinor / 100)}
                value={item.unitPriceOverride ?? ""}
                onChange={(e) =>
                  onChange({ unitPriceOverride: e.target.value === "" ? undefined : parseFloat(e.target.value) })
                }
                className="mt-0.5 w-full h-8 rounded border border-paper-line-2 px-2 text-sm tabular"
              />
            </label>
          )}
          {itemDiscountEnabled && (
            <label className="flex-1 text-xs text-slate">
              Item discount (₹)
              <input
                type="number"
                step="0.01"
                min={0}
                value={item.discountValue ?? ""}
                onChange={(e) =>
                  onChange({
                    discountValue: e.target.value === "" ? undefined : parseFloat(e.target.value),
                  })
                }
                className="mt-0.5 w-full h-8 rounded border border-paper-line-2 px-2 text-sm tabular"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
