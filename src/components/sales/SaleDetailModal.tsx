"use client";

import { useEffect, useMemo } from "react";
import type { Order } from "@/types/inventory";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatPaymentDetail } from "@/lib/payments";
import {
  activityTypeLabel,
  formatActivityDetail,
  formatOrderLineServing,
  formatSaleListLineDescription,
  getActivityForOrder,
} from "@/lib/sale-detail";
import { Badge } from "@/components/ui/Badge";

interface SaleDetailModalProps {
  order: Order;
  onClose: () => void;
}

export function SaleDetailModal({ order, onClose }: SaleDetailModalProps) {
  const activities = useMemo(() => getActivityForOrder(order.id), [order.id]);
  const editActivities = activities.filter((a) => a.type !== "bill_completed");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const locationLabel = order.tableNumber
    ? `Table ${order.tableNumber}`
    : order.customerName;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{locationLabel}</h2>
                <Badge variant={order.type === "table" ? "info" : "neutral"}>
                  {order.type === "table" ? "Table" : "Walk-in"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {formatDateTime(order.completedAt ?? order.createdAt)} · {order.managerName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Order items
            </h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">Item</th>
                    <th className="px-4 py-2.5">Details</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((line) => (
                    <tr key={`${line.menuItemId}-${line.pourOptionId ?? line.servingSizeMl}-${line.addedAt}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {line.itemName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{formatSaleListLineDescription(line)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatOrderLineServing(line)} · {formatMoney(line.unitPrice)} each
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                        {formatMoney(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {activities.length > 0 && (
            <section className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bill history
              </h3>
              <div className="mt-3 space-y-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <span className="w-14 shrink-0 text-xs tabular-nums text-slate-400">
                      {new Date(act.timestamp).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Badge
                        variant={
                          act.type === "bill_completed"
                            ? "success"
                            : act.type === "item_removed" || act.type === "item_decreased"
                              ? "warning"
                              : "info"
                        }
                      >
                        {activityTypeLabel(act.type)}
                      </Badge>
                      <p className="mt-1 text-sm text-slate-700">
                        {formatActivityDetail(act)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {editActivities.length === 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  No quantity edits — all items served as ordered.
                </p>
              )}
            </section>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1 text-sm">
              {order.discountAmount != null && order.discountAmount > 0 && (
                <p className="text-slate-500">
                  Subtotal {formatMoney(order.subtotal)}
                  <span className="ml-2 text-amber-700">
                    {order.discountLabel ?? `${order.discountPercent}% off`} −
                    {formatMoney(order.discountAmount)}
                  </span>
                </p>
              )}
              <p className="text-slate-600">
                Payment:{" "}
                {order.paymentMethod
                  ? formatPaymentDetail(
                      {
                        method: order.paymentMethod,
                        cashAmount: order.paymentCashAmount ?? 0,
                        onlineAmount: order.paymentOnlineAmount ?? 0,
                      },
                      formatMoney
                    )
                  : "—"}
              </p>
            </div>
            <p className="text-xl font-bold tabular-nums text-emerald-700">
              {formatMoney(order.total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
