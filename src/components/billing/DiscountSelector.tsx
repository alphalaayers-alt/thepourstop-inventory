"use client";

import {
  BILL_DISCOUNT_OPTIONS,
  type BillDiscountOption,
} from "@/lib/discounts";

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function displayLabel(option: BillDiscountOption, compact: boolean): string {
  if (!compact) return option.label;
  if (option.id === "none") return "No discount";
  if (option.percent >= 10) return `${option.percent}% off entire order`;
  return `${option.percent}% off`;
}

interface DiscountSelectorProps {
  selectedDiscountId: string;
  onSelect: (id: string) => void;
  className?: string;
  /** Use in narrow columns — single column, shorter labels */
  compact?: boolean;
}

export function DiscountSelector({
  selectedDiscountId,
  onSelect,
  className = "",
  compact = false,
}: DiscountSelectorProps) {
  return (
    <div
      className={`grid gap-1.5 ${compact ? "grid-cols-1" : "grid-cols-1 gap-2 sm:grid-cols-2"} ${className}`}
    >
      {BILL_DISCOUNT_OPTIONS.map((option) => {
        const selected = selectedDiscountId === option.id;
        const isWide = !compact && (option.id === "none" || option.percent >= 10);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`group flex w-full min-w-0 items-start gap-2 rounded-lg border-2 px-2.5 py-2 text-left transition-all sm:gap-2.5 sm:px-3 sm:py-2.5 ${
              isWide ? "sm:col-span-2" : ""
            } ${
              selected
                ? "border-emerald-500 bg-emerald-50/80 shadow-sm shadow-emerald-100"
                : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white group-hover:border-slate-400"
              }`}
            >
              {selected && <CheckIcon />}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm leading-snug break-words ${
                  selected ? "font-medium text-emerald-900" : "text-slate-700"
                }`}
              >
                {displayLabel(option, compact)}
              </span>
            </span>
            {option.percent > 0 && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                  selected
                    ? "bg-emerald-200/80 text-emerald-800"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                −{option.percent}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function getSelectedDiscountOption(
  selectedDiscountId: string
): BillDiscountOption {
  return (
    BILL_DISCOUNT_OPTIONS.find((d) => d.id === selectedDiscountId) ??
    BILL_DISCOUNT_OPTIONS[0]
  );
}
