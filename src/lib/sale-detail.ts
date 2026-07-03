import { getActivityLog } from "./catalog";
import type { BillActivity, Order, OrderLineItem } from "@/types/inventory";
import { formatMoney } from "./format";

export function formatOrderLineServing(line: OrderLineItem): string {
  if (line.unitType === "bottle") return "Bottle";
  if (line.pourLabel) return line.pourLabel;
  return `${line.servingSizeMl}ml`;
}

export function formatOrderLineVolume(line: OrderLineItem): string {
  if (line.unitType === "bottle") {
    return `${line.quantity} bottle${line.quantity !== 1 ? "s" : ""}`;
  }
  const ml = line.stockDeducted ?? line.quantity * line.servingSizeMl;
  return `${ml.toLocaleString("en-IN")} ml`;
}

export function formatSaleListLineDescription(line: OrderLineItem): string {
  if (line.unitType === "bottle") {
    return `${line.quantity} bottle${line.quantity !== 1 ? "s" : ""}`;
  }

  const serving = formatOrderLineServing(line);
  const totalMl = line.stockDeducted ?? line.quantity * line.servingSizeMl;
  const isFullBottle = /full bottle/i.test(serving);

  if (isFullBottle) {
    return `${line.quantity} full bottle${line.quantity !== 1 ? "s" : ""} · ${totalMl.toLocaleString("en-IN")} ml`;
  }

  return `${line.quantity} × ${serving} · ${totalMl.toLocaleString("en-IN")} ml total`;
}

export function formatOrderLineSummary(line: OrderLineItem): string {
  return `${line.itemName} · ${formatOrderLineServing(line)} · ×${line.quantity} · ${formatMoney(line.lineTotal)}`;
}

export function getActivityForOrder(orderId: string): BillActivity[] {
  return getActivityLog()
    .filter((act) => act.orderId === orderId)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}

export function groupActivityByOrder(
  orderIds: string[]
): Map<string, BillActivity[]> {
  const idSet = new Set(orderIds);
  const map = new Map<string, BillActivity[]>();

  for (const act of getActivityLog()) {
    if (!idSet.has(act.orderId)) continue;
    const list = map.get(act.orderId) ?? [];
    list.push(act);
    map.set(act.orderId, list);
  }

  for (const [id, list] of map) {
    map.set(
      id,
      list.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    );
  }

  return map;
}

export function activityTypeLabel(type: BillActivity["type"]): string {
  switch (type) {
    case "bill_completed":
      return "Bill completed";
    case "item_increased":
      return "Qty increased";
    case "item_decreased":
      return "Qty decreased";
    case "item_removed":
      return "Item removed";
    default:
      return "Item served";
  }
}

export function formatActivityDetail(act: BillActivity): string {
  const qtyMl =
    act.unitType === "pour" && act.servingSizeMl && act.quantity
      ? ` (${act.quantity * act.servingSizeMl}ml)`
      : "";

  if (act.type === "bill_completed") {
    const parts = [`Total ${formatMoney(act.billTotal ?? 0)}`];
    if (act.discountAmount != null && act.discountAmount > 0) {
      parts.push(
        `${act.discountLabel ?? `${act.discountPercent}% off`} −${formatMoney(act.discountAmount)}`
      );
    }
    return parts.join(" · ");
  }

  if (act.type === "item_increased" || act.type === "item_decreased") {
    const from = act.previousQuantity ?? act.quantity ?? 0;
    const to = act.quantity ?? from;
    return `${act.itemName} · ×${from} → ×${to}${qtyMl}${act.amount != null ? ` · ${formatMoney(act.amount)}` : ""}`;
  }

  if (act.type === "item_removed") {
    return `Removed ${act.itemName}${act.quantity ? ` × ${act.quantity}${qtyMl}` : ""}${act.amount != null ? ` · ${formatMoney(act.amount)}` : ""}`;
  }

  return `${act.itemName ?? "Item"}${act.quantity ? ` × ${act.quantity}${qtyMl}` : ""}${act.amount != null ? ` · ${formatMoney(act.amount)}` : ""}`;
}

export function formatOrderItemsPreview(order: Order, maxItems = 2): string {
  if (order.items.length === 0) return "—";

  const parts = order.items.slice(0, maxItems).map((line) => {
    if (line.unitType === "bottle") {
      return `${line.itemName} · ${line.quantity} bottle${line.quantity !== 1 ? "s" : ""}`;
    }
    return `${line.itemName} · ${formatSaleListLineDescription(line)}`;
  });

  if (order.items.length > maxItems) {
    parts.push(`+${order.items.length - maxItems} more`);
  }

  return parts.join(" · ");
}

export function summarizeOrderItems(order: Order): string {
  if (order.items.length === 0) return "No items";
  const preview = order.items
    .slice(0, 2)
    .map((line) => `${line.itemName} ×${line.quantity}`)
    .join(", ");
  if (order.items.length <= 2) return preview;
  return `${preview} +${order.items.length - 2} more`;
}
