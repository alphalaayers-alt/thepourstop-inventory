import type { DailySales, DashboardStats, Order } from "@/types/inventory";
import {
  getBusinessDateForTimestamp,
  getBusinessDayRange,
  getBusinessDayRangeForDateKey,
  isWithinBusinessDayRange,
  type BusinessDayRange,
} from "./business-day";
import { getInventory, isLowStock } from "./inventory";
import { getCompletedOrders } from "./orders";
import { toDateKey } from "./format";

function getOrdersInBusinessRange(range: BusinessDayRange): Order[] {
  return getCompletedOrders()
    .filter((order) =>
      isWithinBusinessDayRange(order.completedAt ?? order.createdAt, range)
    )
    .sort(
      (a, b) =>
        new Date(a.completedAt ?? a.createdAt).getTime() -
        new Date(b.completedAt ?? b.createdAt).getTime()
    );
}

export function getTodayOrders(): Order[] {
  return getOrdersInBusinessRange(getBusinessDayRange());
}

export function getOrdersForDate(dateKey: string): Order[] {
  const current = getBusinessDayRange();
  if (dateKey === current.businessDateKey) {
    return getOrdersInBusinessRange(current);
  }
  return getOrdersInBusinessRange(getBusinessDayRangeForDateKey(dateKey));
}

export function getTotalItemsSold(orders: Order[]): number {
  return orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );
}

export interface TodayItemSold {
  menuItemId: string;
  name: string;
  unitType: "bottle" | "pour";
  bottleCount: number;
  mlSold: number;
  revenue: number;
}

function getLineMenuId(line: Order["items"][number]): string {
  return (
    line.menuItemId ??
    (line as { inventoryItemId?: string }).inventoryItemId ??
    line.itemName
  );
}

export function getTodayItemsSoldBreakdown(orders: Order[]): TodayItemSold[] {
  const map = new Map<string, TodayItemSold>();

  for (const order of orders) {
    for (const line of order.items) {
      const id = getLineMenuId(line);
      const existing = map.get(id) ?? {
        menuItemId: id,
        name: line.itemName,
        unitType: line.unitType,
        bottleCount: 0,
        mlSold: 0,
        revenue: 0,
      };

      if (line.unitType === "bottle") {
        existing.bottleCount += line.quantity;
      } else {
        existing.mlSold += line.stockDeducted ?? line.quantity * line.servingSizeMl;
      }
      existing.revenue += line.lineTotal;
      map.set(id, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const aVolume = a.unitType === "bottle" ? a.bottleCount : a.mlSold;
    const bVolume = b.unitType === "bottle" ? b.bottleCount : b.mlSold;
    return bVolume - aVolume;
  });
}

export function formatTodayItemSoldAmount(item: TodayItemSold): string {
  if (item.unitType === "bottle") {
    return `${item.bottleCount} bottle${item.bottleCount !== 1 ? "s" : ""}`;
  }
  return `${item.mlSold.toLocaleString("en-IN")} ml`;
}

export function getOrdersInLastMonths(months: number): Order[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return getCompletedOrders().filter(
    (o) => new Date(o.completedAt ?? o.createdAt) >= cutoff
  );
}

export function getDashboardStats(): DashboardStats {
  const todayOrders = getTodayOrders();
  const inventory = getInventory();

  return {
    todaySales: todayOrders.reduce((sum, o) => sum + o.total, 0),
    todayOrders: todayOrders.length,
    todayCustomers: new Set(
      todayOrders.map((o) =>
        o.tableId ? `table-${o.tableNumber}` : o.customerName
      )
    ).size,
    totalStockItems: inventory.length,
    lowStockCount: inventory.filter(isLowStock).length,
    totalInventoryValue: inventory.reduce(
      (sum, i) => sum + i.purchasePrice * i.stockQuantity,
      0
    ),
  };
}

export function getDailySalesForDays(days: number): DailySales[] {
  const orders = getCompletedOrders();
  const result: DailySales[] = [];
  const todayBusinessDate = getBusinessDateForTimestamp();
  const currentRange = getBusinessDayRange();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(todayBusinessDate);
    date.setDate(date.getDate() - i);
    const key = toDateKey(date);
    const range =
      key === currentRange.businessDateKey
        ? currentRange
        : getBusinessDayRangeForDateKey(key);

    const dayOrders = orders.filter((order) =>
      isWithinBusinessDayRange(order.completedAt ?? order.createdAt, range)
    );

    result.push({
      date: key,
      total: dayOrders.reduce((sum, o) => sum + o.total, 0),
      orderCount: dayOrders.length,
    });
  }

  return result;
}

export function getMonthlySales(months: number): { month: string; total: number; orders: number }[] {
  const orders = getOrdersInLastMonths(months);
  const map = new Map<string, { total: number; orders: number }>();

  for (const order of orders) {
    const date = new Date(order.completedAt ?? order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(key) ?? { total: 0, orders: 0 };
    map.set(key, {
      total: existing.total + order.total,
      orders: existing.orders + 1,
    });
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}

export function getSalesByCategory(orders: Order[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const order of orders) {
    for (const item of order.items) {
      result[item.category] = (result[item.category] ?? 0) + item.lineTotal;
    }
  }
  return result;
}

export function getTopSellingItems(orders: Order[], limit = 5) {
  const map = new Map<string, { key: string; name: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.itemName.trim().toLowerCase();
      if (!key) continue;

      const existing = map.get(key) ?? {
        key,
        name: item.itemName,
        quantity: 0,
        revenue: 0,
      };
      map.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.lineTotal,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
