import type {
  AddToOrderInput,
  Order,
  OrderLineItem,
  OrderType,
} from "@/types/inventory";
import {
  calcStockNeeded,
  canFulfillQuantity,
  deductStock,
  getSellableItem,
  logActivity,
  restoreStock,
} from "./catalog";
import {
  findPourOption,
  getBillingPourOptions,
} from "./pour-sizes";
import type { BillPayment } from "./payments";
import { validateBillPayment } from "./payments";
import { calculateOrderTotals, roundMoney } from "./discounts";
import { getItem, setItem, storageKeys } from "./storage";
import { setTableAvailable, setTableRunning } from "./tables";

function generateId(): string {
  return crypto.randomUUID();
}

function getLineMenuId(line: OrderLineItem): string {
  return line.menuItemId ?? (line as { inventoryItemId?: string }).inventoryItemId ?? "";
}

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    items: order.items.map((line) => ({
      ...line,
      menuItemId: getLineMenuId(line),
      served: line.served ?? false,
      servedAt: line.servedAt ?? null,
      addedAt: line.addedAt ?? order.createdAt,
    })),
    discountLabel: order.discountLabel ?? null,
    discountPercent: order.discountPercent ?? 0,
    discountAmount: order.discountAmount ?? 0,
    paymentMethod: order.paymentMethod ?? null,
    paymentCashAmount: order.paymentCashAmount ?? 0,
    paymentOnlineAmount: order.paymentOnlineAmount ?? 0,
  };
}

export function getOrders(): Order[] {
  return (getItem<Order[]>(storageKeys.orders) ?? []).map(normalizeOrder);
}

function saveOrders(orders: Order[]): void {
  setItem(storageKeys.orders, orders);
}

export function getCompletedOrders(): Order[] {
  return getOrders()
    .filter((o) => o.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime()
    );
}

export function getActiveOrderForTable(tableId: string): Order | undefined {
  return getOrders().find(
    (o) => o.tableId === tableId && o.status === "active"
  );
}

export function getOrderById(id: string): Order | undefined {
  return getOrders().find((o) => o.id === id);
}

function matchesOrderLine(
  line: OrderLineItem,
  menuItemId: string,
  opts?: { servingSizeMl?: number; pourOptionId?: string }
): boolean {
  if (line.menuItemId !== menuItemId) return false;
  if (opts?.pourOptionId) return line.pourOptionId === opts.pourOptionId;
  if (opts?.servingSizeMl !== undefined) return line.servingSizeMl === opts.servingSizeMl;
  return true;
}

function buildLineItem(
  menuItemId: string,
  quantity: number,
  orderId: string,
  servingSizeMl?: number,
  pourOptionId?: string,
  options?: { skipStockCheck?: boolean }
): { success: true; line: OrderLineItem } | { success: false; error: string } {
  const item = getSellableItem(menuItemId);
  if (!item) {
    return { success: false, error: "Item not found on menu." };
  }

  let ml = servingSizeMl ?? item.servingSizeMl;
  let unitPrice = item.sellPrice;
  let pourLabel: string | undefined;
  let resolvedPourOptionId = pourOptionId;

  if (item.unitType === "pour") {
    const option = resolvedPourOptionId
      ? findPourOption(item, { optionId: resolvedPourOptionId })
      : findPourOption(item, ml);
    if (!option) {
      return {
        success: false,
        error: `Pour option is not available for ${item.name}.`,
      };
    }
    ml = option.totalMl;
    unitPrice = option.price;
    pourLabel = option.label;
    resolvedPourOptionId = option.optionId;
  }

  if (!options?.skipStockCheck) {
    const check = canFulfillQuantity(menuItemId, quantity, orderId, ml);
    if (!check.ok) return { success: false, error: check.error };
  }

  const stockDeducted = calcStockNeeded(item, quantity, ml);

  return {
    success: true,
    line: {
      menuItemId: item.id,
      itemName: item.name,
      category: item.category,
      unitType: item.unitType,
      quantity,
      servingSizeMl: ml,
      pourOptionId: resolvedPourOptionId,
      pourLabel,
      unitPrice,
      lineTotal: unitPrice * quantity,
      stockDeducted,
      served: false,
      servedAt: null,
      addedAt: new Date().toISOString(),
    },
  };
}

function recalculateOrder(order: Order): Order {
  const subtotal = roundMoney(order.items.reduce((sum, i) => sum + i.lineTotal, 0));
  return {
    ...order,
    subtotal,
    total: subtotal,
    discountLabel: null,
    discountPercent: 0,
    discountAmount: 0,
  };
}

export type OrderLineActivityOptions = {
  managerName: string;
  logChange?: boolean;
};

function logServedLineQuantityChange(
  order: Order,
  line: OrderLineItem,
  oldQty: number,
  newQty: number,
  managerName: string
): void {
  const now = new Date().toISOString();
  const delta = Math.abs(newQty - oldQty);

  if (newQty > oldQty) {
    logActivity({
      orderId: order.id,
      type: "item_increased",
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      itemName: line.itemName,
      quantity: newQty,
      previousQuantity: oldQty,
      servingSizeMl: line.servingSizeMl,
      unitType: line.unitType,
      amount: roundMoney(line.unitPrice * delta),
      managerName,
      timestamp: now,
    });
    return;
  }

  logActivity({
    orderId: order.id,
    type: "item_decreased",
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    itemName: line.itemName,
    quantity: newQty,
    previousQuantity: oldQty,
    servingSizeMl: line.servingSizeMl,
    unitType: line.unitType,
    amount: roundMoney(line.unitPrice * delta),
    managerName,
    timestamp: now,
  });
}

function logServedLineRemoved(
  order: Order,
  line: OrderLineItem,
  managerName: string
): void {
  logActivity({
    orderId: order.id,
    type: "item_removed",
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    itemName: line.itemName,
    quantity: line.quantity,
    previousQuantity: line.quantity,
    servingSizeMl: line.servingSizeMl,
    unitType: line.unitType,
    amount: line.lineTotal,
    managerName,
    timestamp: new Date().toISOString(),
  });
}

export function createOrder(params: {
  type: OrderType;
  tableId?: string | null;
  tableNumber?: number | null;
  customerName?: string;
  managerId: string;
  managerName: string;
}): Order {
  const order: Order = {
    id: generateId(),
    type: params.type,
    tableId: params.tableId ?? null,
    tableNumber: params.tableNumber ?? null,
    customerName: params.customerName?.trim() || "Walk-in Customer",
    items: [],
    subtotal: 0,
    total: 0,
    status: "active",
    managerId: params.managerId,
    managerName: params.managerName,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const orders = [...getOrders(), order];
  saveOrders(orders);

  if (params.tableId) {
    setTableRunning(params.tableId, order.id);
  }

  return order;
}

export function addItemToOrder(
  orderId: string,
  input: AddToOrderInput
): { success: true; order: Order } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);

  if (index === -1) return { success: false, error: "Order not found." };
  if (orders[index].status !== "active") {
    return { success: false, error: "This order is already closed." };
  }
  if (input.quantity <= 0) {
    return { success: false, error: "Quantity must be at least 1." };
  }

  const order = { ...orders[index] };
  const existingIndex = order.items.findIndex((i) =>
    matchesOrderLine(i, input.menuItemId, {
      servingSizeMl: input.servingSizeMl,
      pourOptionId: input.pourOptionId,
    })
  );

  let lineResult;
  if (existingIndex >= 0) {
    const existing = order.items[existingIndex];
    const mergedQty = existing.quantity + input.quantity;
    lineResult = buildLineItem(
      input.menuItemId,
      mergedQty,
      orderId,
      existing.servingSizeMl,
      existing.pourOptionId
    );
    if (!lineResult.success) return lineResult;
    order.items[existingIndex] = {
      ...lineResult.line,
      addedAt: order.items[existingIndex].addedAt,
    };
  } else {
    lineResult = buildLineItem(
      input.menuItemId,
      input.quantity,
      orderId,
      input.servingSizeMl,
      input.pourOptionId
    );
    if (!lineResult.success) return lineResult;
    order.items.push(lineResult.line);
  }

  orders[index] = recalculateOrder(order);
  saveOrders(orders);

  const addedLine = lineResult.line;
  logActivity({
    orderId,
    type: "item_added",
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    itemName: addedLine.itemName,
    quantity: input.quantity,
    servingSizeMl: addedLine.servingSizeMl,
    unitType: addedLine.unitType,
    amount: addedLine.unitPrice * input.quantity,
    managerName: order.managerName,
    timestamp: new Date().toISOString(),
  });

  return { success: true, order: orders[index] };
}

export function serveItemToOrder(
  orderId: string,
  input: AddToOrderInput
): { success: true; order: Order } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);

  if (index === -1) return { success: false, error: "Order not found." };
  if (orders[index].status !== "active") {
    return { success: false, error: "This order is already closed." };
  }
  if (input.quantity <= 0) {
    return { success: false, error: "Quantity must be at least 1." };
  }

  const order = { ...orders[index] };
  const existingIndex = order.items.findIndex((i) =>
    matchesOrderLine(i, input.menuItemId, {
      servingSizeMl: input.servingSizeMl,
      pourOptionId: input.pourOptionId,
    })
  );

  let lineResult;
  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = order.items[existingIndex];
    const mergedQty = existing.quantity + input.quantity;
    lineResult = buildLineItem(
      input.menuItemId,
      mergedQty,
      orderId,
      existing.servingSizeMl,
      existing.pourOptionId
    );
    if (!lineResult.success) return lineResult;

    const deduct = deductStock(
      input.menuItemId,
      input.quantity,
      lineResult.line.servingSizeMl
    );
    if (!deduct.success) return deduct;

    order.items[existingIndex] = {
      ...lineResult.line,
      served: true,
      servedAt: now,
      addedAt: order.items[existingIndex].addedAt,
    };
  } else {
    lineResult = buildLineItem(
      input.menuItemId,
      input.quantity,
      orderId,
      input.servingSizeMl,
      input.pourOptionId
    );
    if (!lineResult.success) return lineResult;

    const deduct = deductStock(
      input.menuItemId,
      input.quantity,
      lineResult.line.servingSizeMl
    );
    if (!deduct.success) return deduct;

    order.items.push({
      ...lineResult.line,
      served: true,
      servedAt: now,
    });
  }

  orders[index] = recalculateOrder(order);
  saveOrders(orders);

  const servedLine = lineResult.line;
  logActivity({
    orderId,
    type: "item_added",
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    itemName: servedLine.itemName,
    quantity: input.quantity,
    servingSizeMl: servedLine.servingSizeMl,
    unitType: servedLine.unitType,
    amount: servedLine.unitPrice * input.quantity,
    managerName: order.managerName,
    timestamp: now,
  });

  return { success: true, order: orders[index] };
}

export function updateOrderLineQuantity(
  orderId: string,
  menuItemId: string,
  quantity: number,
  match?: { servingSizeMl?: number; pourOptionId?: string },
  activity?: OrderLineActivityOptions
): { success: true; order: Order } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return { success: false, error: "Order not found." };
  if (orders[index].status !== "active") {
    return { success: false, error: "Order is closed." };
  }

  if (quantity <= 0) {
    return removeItemFromOrder(orderId, menuItemId, match, activity);
  }

  const order = { ...orders[index] };
  const lineIndex = order.items.findIndex((i) =>
    matchesOrderLine(i, menuItemId, match)
  );
  if (lineIndex === -1) return { success: false, error: "Item not in bill." };

  const line = order.items[lineIndex];
  const oldQty = line.quantity;

  if (line.served && quantity !== oldQty) {
    const delta = quantity - oldQty;
    if (delta > 0) {
      const check = canFulfillQuantity(
        menuItemId,
        delta,
        orderId,
        line.servingSizeMl
      );
      if (!check.ok) return { success: false, error: check.error };

      const deduct = deductStock(menuItemId, delta, line.servingSizeMl);
      if (!deduct.success) return deduct;
    } else {
      const restore = restoreStock(menuItemId, -delta, line.servingSizeMl);
      if (!restore.success) return restore;
    }
  }

  const lineResult = buildLineItem(
    menuItemId,
    quantity,
    orderId,
    line.servingSizeMl,
    line.pourOptionId,
    line.served ? { skipStockCheck: true } : undefined
  );

  if (!lineResult.success) return lineResult;

  order.items[lineIndex] = {
    ...lineResult.line,
    addedAt: line.addedAt,
    ...(line.served
      ? { served: true, servedAt: line.servedAt ?? line.addedAt }
      : {}),
  };

  orders[index] = recalculateOrder(order);
  saveOrders(orders);

  if (
    activity?.logChange &&
    line.served &&
    quantity !== oldQty &&
    activity.managerName
  ) {
    logServedLineQuantityChange(
      orders[index],
      line,
      oldQty,
      quantity,
      activity.managerName
    );
  }

  return { success: true, order: orders[index] };
}

export function incrementLineItem(
  orderId: string,
  menuItemId: string,
  match?: { servingSizeMl?: number; pourOptionId?: string }
): ReturnType<typeof updateOrderLineQuantity> {
  const order = getOrderById(orderId);
  if (!order) return { success: false, error: "Order not found." };
  const line = order.items.find((i) => matchesOrderLine(i, menuItemId, match));
  if (!line) return { success: false, error: "Item not in bill." };
  return updateOrderLineQuantity(orderId, menuItemId, line.quantity + 1, {
    servingSizeMl: line.servingSizeMl,
    pourOptionId: line.pourOptionId,
  });
}

export function decrementLineItem(
  orderId: string,
  menuItemId: string,
  match?: { servingSizeMl?: number; pourOptionId?: string }
): ReturnType<typeof updateOrderLineQuantity> {
  const order = getOrderById(orderId);
  if (!order) return { success: false, error: "Order not found." };
  const line = order.items.find((i) => matchesOrderLine(i, menuItemId, match));
  if (!line) return { success: false, error: "Item not in bill." };
  return updateOrderLineQuantity(orderId, menuItemId, line.quantity - 1, {
    servingSizeMl: line.servingSizeMl,
    pourOptionId: line.pourOptionId,
  });
}

export function removeItemFromOrder(
  orderId: string,
  menuItemId: string,
  match?: { servingSizeMl?: number; pourOptionId?: string },
  activity?: OrderLineActivityOptions
): { success: true; order: Order } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return { success: false, error: "Order not found." };

  const line = orders[index].items.find((i) => matchesOrderLine(i, menuItemId, match));
  const orderBefore = orders[index];

  if (line?.served) {
    restoreStock(menuItemId, line.quantity, line.servingSizeMl);
  }

  const order = {
    ...orders[index],
    items: orders[index].items.filter(
      (i) => !matchesOrderLine(i, menuItemId, match)
    ),
  };

  orders[index] = recalculateOrder(order);
  saveOrders(orders);

  if (
    activity?.logChange &&
    line?.served &&
    activity.managerName
  ) {
    logServedLineRemoved(orderBefore, line, activity.managerName);
  }

  return { success: true, order: orders[index] };
}

export function completeOrder(
  orderId: string,
  discount?: { label: string; percent: number },
  payment?: BillPayment
): { success: true; order: Order } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return { success: false, error: "Order not found." };

  const order = orders[index];
  if (order.status !== "active") {
    return { success: false, error: "Order is already completed." };
  }
  if (order.items.length === 0) {
    return { success: false, error: "Add at least one item before billing." };
  }

  for (const line of order.items) {
    if (line.served) continue;

    const check = canFulfillQuantity(
      line.menuItemId,
      line.quantity,
      orderId,
      line.servingSizeMl
    );
    if (!check.ok) return { success: false, error: check.error };

    const result = deductStock(line.menuItemId, line.quantity, line.servingSizeMl);
    if (!result.success) return result;
  }

  const completedAt = new Date().toISOString();
  const totals = calculateOrderTotals(
    order.items,
    discount && discount.percent > 0 ? discount : null
  );

  if (payment) {
    const paymentCheck = validateBillPayment(payment, totals.total);
    if (!paymentCheck.ok) {
      return { success: false, error: paymentCheck.error };
    }
  }

  const completed: Order = {
    ...order,
    ...totals,
    paymentMethod: payment?.method ?? "cash",
    paymentCashAmount: payment?.cashAmount ?? totals.total,
    paymentOnlineAmount: payment?.onlineAmount ?? 0,
    status: "completed",
    completedAt,
  };

  orders[index] = completed;
  saveOrders(orders);

  if (completed.tableId) {
    setTableAvailable(completed.tableId);
  }

  logActivity({
    orderId,
    type: "bill_completed",
    tableNumber: completed.tableNumber,
    customerName: completed.customerName,
    billTotal: completed.total,
    discountLabel: completed.discountLabel ?? undefined,
    discountPercent: completed.discountPercent,
    discountAmount: completed.discountAmount,
    paymentMethod: completed.paymentMethod ?? undefined,
    paymentCashAmount: completed.paymentCashAmount,
    paymentOnlineAmount: completed.paymentOnlineAmount,
    managerName: completed.managerName,
    timestamp: completedAt,
  });

  return { success: true, order: completed };
}

export function cancelOrder(
  orderId: string
): { success: true } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return { success: false, error: "Order not found." };

  const order = orders[index];
  if (order.status !== "active") {
    return { success: false, error: "Only active orders can be cancelled." };
  }

  for (const line of order.items) {
    if (line.served) {
      restoreStock(line.menuItemId, line.quantity, line.servingSizeMl);
    }
  }

  orders[index] = { ...order, status: "cancelled" };
  saveOrders(orders);

  if (order.tableId) {
    setTableAvailable(order.tableId);
  }

  return { success: true };
}

export function deleteCompletedOrder(
  orderId: string
): { success: true } | { success: false; error: string } {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return { success: false, error: "Order not found." };

  const order = orders[index];
  if (order.status !== "completed") {
    return { success: false, error: "Only completed bills can be deleted." };
  }

  for (const line of order.items) {
    restoreStock(line.menuItemId, line.quantity, line.servingSizeMl);
  }

  saveOrders(orders.filter((o) => o.id !== orderId));
  return { success: true };
}
