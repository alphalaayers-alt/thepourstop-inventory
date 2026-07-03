"use client";

import { useMemo, useState } from "react";
import type { Order } from "@/types/inventory";
import {
  formatTodayItemSoldAmount,
  getTodayItemsSoldBreakdown,
} from "@/lib/analytics";
import { Button } from "@/components/ui/Button";

const TOP_VISIBLE = 4;

interface TodayItemsSoldCardProps {
  orders: Order[];
}

export function TodayItemsSoldCard({ orders }: TodayItemsSoldCardProps) {
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => getTodayItemsSoldBreakdown(orders), [orders]);
  const visibleItems = expanded ? items : items.slice(0, TOP_VISIBLE);
  const hasMore = items.length > TOP_VISIBLE;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Items Sold Today</p>
          <p className="mt-1 text-xs text-slate-400">
            {items.length === 0
              ? "No items sold yet"
              : `${items.length} menu item${items.length !== 1 ? "s" : ""} sold`}
          </p>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            Top seller
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Sales will appear here after bills are completed.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {visibleItems.map((item, index) => (
              <li
                key={item.menuItemId}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">
                    {index === 0 && !expanded && (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                    {item.name}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-slate-700">
                  {formatTodayItemSoldAmount(item)}
                </span>
              </li>
            ))}
          </ul>

          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "Show less" : `See more (${items.length - TOP_VISIBLE} more)`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
