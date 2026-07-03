"use client";

import { useMemo } from "react";
import type { InventoryItem } from "@/types/inventory";
import { formatStockQuantity } from "@/lib/format";

interface InStockSectionProps {
  items: InventoryItem[];
}

export function InStockSection({ items }: InStockSectionProps) {
  const inStackItems = useMemo(
    () =>
      items
        .filter((item) => item.stockQuantity > 0)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [items]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">In Stack</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {inStackItems.length} item{inStackItems.length !== 1 ? "s" : ""} with stock
        </p>
      </div>

      {inStackItems.length === 0 ? (
        <p className="py-14 text-center text-sm text-slate-400">No items in stack</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {inStackItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
            >
              <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                {item.name}
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums text-slate-600">
                {formatStockQuantity(item)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
