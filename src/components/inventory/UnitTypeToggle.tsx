"use client";

import type { StockUnitType } from "@/types/inventory";

interface UnitTypeToggleProps {
  value: StockUnitType;
  onChange: (value: StockUnitType) => void;
}

export function UnitTypeToggle({ value, onChange }: UnitTypeToggleProps) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-sm font-medium text-slate-700">How is this sold?</p>
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        <button
          type="button"
          onClick={() => onChange("bottle")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            value === "bottle"
              ? "bg-white text-teal-800 shadow-sm ring-1 ring-teal-500/20"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Bottle / can
        </button>
        <button
          type="button"
          onClick={() => onChange("pour")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            value === "pour"
              ? "bg-white text-teal-800 shadow-sm ring-1 ring-teal-500/20"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          By peg / combo
        </button>
      </div>
    </div>
  );
}
