"use client";

import { useEffect } from "react";
import type { PourBillingOption } from "@/lib/pour-sizes";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/Button";

interface SellPricesModalProps {
  itemName: string;
  basePrice: number;
  baseLabel: string;
  extraOptions: PourBillingOption[];
  onClose: () => void;
}

export function SellPricesModal({
  itemName,
  basePrice,
  baseLabel,
  extraOptions,
  onClose,
}: SellPricesModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{itemName}</h2>
        <p className="mt-1 text-sm text-slate-500">All sell prices</p>

        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
          <li className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm text-slate-700">{baseLabel}</span>
            <span className="text-sm font-semibold tabular-nums text-emerald-700">
              {formatMoney(basePrice)}
            </span>
          </li>
          {extraOptions.map((option) => (
            <li
              key={option.key}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="text-sm text-slate-700">{option.label}</span>
              <span className="text-sm font-semibold tabular-nums text-emerald-700">
                {formatMoney(option.price)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
