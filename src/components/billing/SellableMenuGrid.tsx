"use client";

import { useMemo } from "react";
import type { InventoryItem } from "@/types/inventory";
import { getCategories, getCategoryName, initializeCategories } from "@/lib/categories";
import {
  formatSellPrice,
  formatStock,
  getServingsAvailable,
} from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

interface SellableMenuGridProps {
  items: InventoryItem[];
  onAddItem: (itemId: string) => void;
  selectedItemId?: string;
}

export function SellableMenuGrid({
  items,
  onAddItem,
  selectedItemId,
}: SellableMenuGridProps) {
  const grouped = useMemo(() => {
    initializeCategories();
    const categoryOrder = getCategories().map((c) => c.slug);
    const map = new Map<string, InventoryItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }

    const ordered: { category: string; label: string; items: InventoryItem[] }[] = [];
    for (const cat of categoryOrder) {
      const catItems = map.get(cat);
      if (catItems?.length) {
        ordered.push({
          category: cat,
          label: getCategoryName(cat),
          items: catItems.sort((a, b) => a.name.localeCompare(b.name)),
        });
        map.delete(cat);
      }
    }
    for (const [cat, catItems] of map) {
      ordered.push({
        category: cat,
        label: getCategoryName(cat),
        items: catItems.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    return ordered;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">No items in stock</p>
        <p className="mt-1 text-xs text-slate-400">
          Add inventory first to sell to customers
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.category}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {group.label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const servings = getServingsAvailable(item);
              const isSelected = selectedItemId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAddItem(item.id)}
                  className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <Badge variant="success">{servings} left</Badge>
                  </div>
                  <p className="mt-2 text-base font-bold text-emerald-700">
                    {formatSellPrice(item)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Stock: {formatStock(item)}
                  </p>
                  {item.unitType === "pour" && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.servingSizeMl}ml peg · Bottle {item.bottleSizeMl ?? 750}ml
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
