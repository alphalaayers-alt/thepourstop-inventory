"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_UPDATED_EVENT, getActivityLog } from "@/lib/catalog";
import type { BillActivity } from "@/types/inventory";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatPaymentDetail } from "@/lib/payments";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

function activityMeta(type: BillActivity["type"]) {
  switch (type) {
    case "bill_completed":
      return {
        icon: "✓",
        badge: "Bill Completed",
        badgeVariant: "success" as const,
        iconClass: "bg-emerald-100 text-emerald-700",
      };
    case "item_increased":
      return {
        icon: "↑",
        badge: "Qty Increased",
        badgeVariant: "info" as const,
        iconClass: "bg-sky-100 text-sky-700",
      };
    case "item_decreased":
      return {
        icon: "↓",
        badge: "Qty Decreased",
        badgeVariant: "warning" as const,
        iconClass: "bg-amber-100 text-amber-700",
      };
    case "item_removed":
      return {
        icon: "×",
        badge: "Item Removed",
        badgeVariant: "warning" as const,
        iconClass: "bg-red-100 text-red-700",
      };
    default:
      return {
        icon: "+",
        badge: "Item Added",
        badgeVariant: "info" as const,
        iconClass: "bg-blue-100 text-blue-700",
      };
  }
}

function formatItemActivity(act: BillActivity) {
  const qtyLabel =
    act.unitType === "pour" && act.servingSizeMl && act.quantity
      ? ` (${act.quantity * act.servingSizeMl}ml)`
      : "";

  if (act.type === "item_increased" || act.type === "item_decreased") {
    const from = act.previousQuantity ?? act.quantity;
    const to = act.quantity ?? from;
    return (
      <>
        <span className="font-medium">{act.itemName}</span>
        {" — "}
        ×{from} → ×{to}
        {qtyLabel}
        {act.amount !== undefined && (
          <span className="text-emerald-700"> — {formatMoney(act.amount)}</span>
        )}
      </>
    );
  }

  if (act.type === "item_removed") {
    return (
      <>
        Removed <span className="font-medium">{act.itemName}</span>
        {act.quantity ? (
          <>
            {" "}
            × {act.quantity}
            {qtyLabel}
          </>
        ) : null}
        {act.amount !== undefined && (
          <span className="text-red-600"> — {formatMoney(act.amount)}</span>
        )}
      </>
    );
  }

  return (
    <>
      <span className="font-medium">{act.itemName}</span>
      {act.quantity && (
        <>
          {" "}
          × {act.quantity}
          {qtyLabel}
        </>
      )}
      {act.amount !== undefined && (
        <span className="text-emerald-700"> — {formatMoney(act.amount)}</span>
      )}
    </>
  );
}

export function ActivityHistory({ limit = 30 }: { limit?: number }) {
  const [activities, setActivities] = useState<BillActivity[]>([]);

  useEffect(() => {
    function load() {
      setActivities(getActivityLog().slice(0, limit));
    }
    load();
    window.addEventListener(ACTIVITY_UPDATED_EVENT, load);
    return () => window.removeEventListener(ACTIVITY_UPDATED_EVENT, load);
  }, [limit]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-400">
          No activity yet — add items to a table bill to see history here
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Bill Activity"
        description="Items added, edited, and bills completed"
      />
      <div className="divide-y divide-slate-100">
        {activities.map((act) => {
          const meta = activityMeta(act.type);
          return (
            <div key={act.id} className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-6">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${meta.iconClass}`}
              >
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={meta.badgeVariant}>{meta.badge}</Badge>
                  {act.tableNumber && (
                    <Badge variant="neutral">Table {act.tableNumber}</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-900">
                  {act.type === "bill_completed" && act.billTotal !== undefined ? (
                    <>
                      Bill closed — {act.customerName} —{" "}
                      <span className="font-semibold text-emerald-700">
                        {formatMoney(act.billTotal)}
                      </span>
                      {act.discountAmount != null && act.discountAmount > 0 && (
                        <span className="text-amber-700">
                          {" "}
                          ({act.discountLabel ?? `${act.discountPercent}% off`} −
                          {formatMoney(act.discountAmount)})
                        </span>
                      )}
                      {act.paymentMethod && (
                        <span className="text-slate-600">
                          {" "}
                          ·{" "}
                          {formatPaymentDetail(
                            {
                              method: act.paymentMethod,
                              cashAmount: act.paymentCashAmount ?? 0,
                              onlineAmount: act.paymentOnlineAmount ?? 0,
                            },
                            formatMoney
                          )}
                        </span>
                      )}
                    </>
                  ) : (
                    formatItemActivity(act)
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDateTime(act.timestamp)} · {act.managerName}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
