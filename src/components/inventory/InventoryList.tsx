"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSellableItems, initializeAppData, isLowStock, STOCK_UPDATED_EVENT } from "@/lib/catalog";
import type { InventoryItem } from "@/types/inventory";
import {
  formatMoney,
  formatSellPrice,
  formatStockQuantity,
  formatStockPegs,
  categoryLabel,
} from "@/lib/format";
import { getCategories, initializeCategories } from "@/lib/categories";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function InventoryList({ showActions = true }: { showActions?: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([]);

  function load() {
    setItems(getSellableItems());
  }

  useEffect(() => {
    initializeAppData();
    initializeCategories();
    load();

    const refresh = () => load();
    window.addEventListener(STOCK_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener(STOCK_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <h3 className="text-base font-semibold text-slate-900">No inventory items</h3>
          <p className="mt-1 text-sm text-slate-500">Add beer, whisky, or other beverages.</p>
          {showActions && (
            <Link href="/manager/inventory/add" className="mt-5 inline-block">
              <Button>+ Add Item</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const categorySlugs = getCategories().map((c) => c.slug);
  const grouped = categorySlugs.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const otherItems = items.filter(
    (i) => !categorySlugs.includes(i.category)
  );

  return (
    <div className="space-y-6">
      {[...grouped, ...(otherItems.length ? [{ category: "other" as const, items: otherItems }] : [])].map(
        (group) => (
          <Card key={group.category}>
            <CardHeader
              title={categoryLabel(group.category)}
              description={`${group.items.length} item(s)`}
              action={
                showActions && group.category === "beer" ? (
                  <Link href="/manager/inventory/add">
                    <Button size="sm">+ Add Item</Button>
                  </Link>
                ) : undefined
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Stock</th>
                    <th className="px-6 py-3">Buy Price</th>
                    <th className="px-6 py-3">Menu Price (Sell)</th>
                    <th className="px-6 py-3">Available to Sell</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        {item.unitType === "pour" && (
                          <p className="text-xs text-slate-400">
                            {item.servingSizeMl}ml peg
                            {item.bottleSizeMl ? ` · ${item.bottleSizeMl}ml bottle` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {formatStockQuantity(item)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatMoney(item.purchasePrice)}
                        {item.unitType === "pour" && (
                          <span className="block text-xs text-slate-400">per bottle</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-700">
                        {formatSellPrice(item)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatStockPegs(item)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={isLowStock(item) ? "warning" : item.stockQuantity > 0 ? "success" : "neutral"}>
                          {item.stockQuantity <= 0
                            ? "No Stock"
                            : isLowStock(item)
                              ? "Low Stock"
                              : "In Stock"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}
