"use client";

import { useEffect, useState } from "react";
import { getCompletedOrders, deleteCompletedOrder } from "@/lib/orders";
import type { Order } from "@/types/inventory";
import { formatDate, formatMoney } from "@/lib/format";
import { formatPaymentDetail } from "@/lib/payments";
import { formatOrderItemsPreview } from "@/lib/sale-detail";
import { confirmAction, showError, showSuccess } from "@/lib/toast";
import { SaleDetailModal } from "@/components/sales/SaleDetailModal";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SalesHistoryProps {
  orders?: Order[];
  title?: string;
  description?: string;
  limit?: number;
  headerAction?: React.ReactNode;
  emptyMessage?: string;
  allowDelete?: boolean;
  onOrdersChange?: () => void;
}

function formatSaleDateTime(iso: string): string {
  const date = formatDate(iso);
  const time = new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

function getPaymentLabel(order: Order) {
  return order.paymentMethod
    ? formatPaymentDetail(
        {
          method: order.paymentMethod,
          cashAmount: order.paymentCashAmount ?? 0,
          onlineAmount: order.paymentOnlineAmount ?? 0,
        },
        formatMoney
      )
    : "—";
}

export function SalesHistory({
  orders: propOrders,
  title = "Sales",
  description,
  limit,
  headerAction,
  emptyMessage = "No sales recorded yet",
  allowDelete = false,
  onOrdersChange,
}: SalesHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  useEffect(() => {
    const data = propOrders ?? getCompletedOrders();
    setOrders(limit ? data.slice(0, limit) : data);
  }, [propOrders, limit]);

  async function handleDelete(order: Order) {
    const confirmed = await confirmAction({
      title: "Delete this bill?",
      text: `Remove bill for ${order.tableNumber ? `Table ${order.tableNumber}` : order.customerName}? Stock will be restored.`,
      confirmText: "Yes, delete",
      icon: "warning",
    });
    if (!confirmed) return;

    const result = deleteCompletedOrder(order.id);
    if (result.success) {
      showSuccess("Bill deleted", "The sale was removed and stock restored.");
      onOrdersChange?.();
      if (propOrders) {
        setOrders((current) => current.filter((o) => o.id !== order.id));
      } else {
        setOrders(getCompletedOrders().slice(0, limit));
      }
    } else {
      showError("Could not delete", result.error);
    }
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader
          title={title}
          description={description}
          action={headerAction}
        />
        <CardContent className="py-12 text-center text-sm text-slate-400">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader
          title={title}
          description={description ?? `${orders.length} sale(s)`}
          action={headerAction}
        />
        <div className="divide-y divide-slate-100 lg:hidden">
          {orders.map((order) => {
            const completedAt = order.completedAt ?? order.createdAt;
            const itemsPreview = formatOrderItemsPreview(order);
            const paymentLabel = getPaymentLabel(order);
            const customerLabel = order.tableNumber
              ? `Table ${order.tableNumber}`
              : order.customerName;

            return (
              <div key={order.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{customerLabel}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                      {formatSaleDateTime(completedAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {order.discountAmount != null && order.discountAmount > 0 ? (
                      <>
                        <p className="text-xs tabular-nums text-slate-400 line-through">
                          {formatMoney(order.subtotal)}
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-emerald-700">
                          {formatMoney(order.total)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold tabular-nums text-emerald-700">
                        {formatMoney(order.total)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{itemsPreview}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={order.type === "table" ? "info" : "neutral"}>
                    {order.type === "table" ? "Table" : "Walk-in"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {order.items.length} line{order.items.length !== 1 ? "s" : ""} · {order.managerName}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{paymentLabel}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDetailOrder(order)}
                  >
                    View
                  </Button>
                  {allowDelete && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(order)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1120px] table-fixed">
            <colgroup>
              <col className="w-[11.5rem]" />
              <col className="w-[6.5rem]" />
              <col />
              <col className="w-[4.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[7.5rem]" />
              <col className="w-[11rem]" />
              <col className={allowDelete ? "w-[9rem]" : "w-[5.5rem]"} />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Date & time</th>
                <th className="px-5 py-3">Table</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3 text-center">Lines</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Manager</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const completedAt = order.completedAt ?? order.createdAt;
                const itemsPreview = formatOrderItemsPreview(order);
                const paymentLabel = getPaymentLabel(order);

                return (
                  <tr
                    key={order.id}
                    className="group align-middle transition-colors hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-sm tabular-nums text-slate-800">
                        {formatSaleDateTime(completedAt)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-sm font-medium text-slate-900">
                        {order.tableNumber
                          ? `Table ${order.tableNumber}`
                          : order.customerName}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p
                        className="truncate text-sm text-slate-600"
                        title={itemsPreview}
                      >
                        {itemsPreview}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                        {order.items.length}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Badge variant={order.type === "table" ? "info" : "neutral"}>
                        {order.type === "table" ? "Table" : "Walk-in"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="truncate text-sm text-slate-600" title={order.managerName}>
                        {order.managerName}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      {order.discountAmount != null && order.discountAmount > 0 ? (
                        <>
                          <p className="text-xs tabular-nums text-slate-400 line-through">
                            {formatMoney(order.subtotal)}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-emerald-700">
                            {formatMoney(order.total)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-semibold tabular-nums text-emerald-700">
                          {formatMoney(order.total)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p
                        className="truncate text-sm text-slate-600"
                        title={paymentLabel}
                      >
                        {paymentLabel}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setDetailOrder(order)}
                        >
                          View
                        </Button>
                        {allowDelete && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(order)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {detailOrder && (
        <SaleDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
      )}
    </>
  );
}
