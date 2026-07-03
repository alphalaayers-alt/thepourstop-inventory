import type { Category } from "@/data/categories";
import type { User, UserRole, ManagerPermissions } from "@/types/auth";
import type {
  BillActivity,
  MenuItem,
  Order,
  StockAddition,
  StockEntry,
  Table,
} from "@/types/inventory";
import { normalizeManagerPermissions } from "../permissions";

export function profileToUser(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  permissions: ManagerPermissions | null;
  created_at: string;
}): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: "",
    role: row.role as UserRole,
    isActive: row.is_active,
    permissions: row.permissions
      ? normalizeManagerPermissions(row.permissions)
      : undefined,
    createdAt: row.created_at,
  };
}

export function rowToCategory(row: {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
  };
}

export function categoryToRow(cat: Category) {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    created_at: cat.createdAt,
  };
}

export function rowToMenuItem(row: {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  sell_price: number;
  serving_size_ml: number;
  pour_sizes: MenuItem["pourSizes"] | null;
  bottle_size_ml: number | null;
  is_active: boolean;
  created_at: string;
}): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unitType: row.unit_type as MenuItem["unitType"],
    sellPrice: Number(row.sell_price),
    servingSizeMl: Number(row.serving_size_ml),
    pourSizes: row.pour_sizes ?? undefined,
    bottleSizeMl: row.bottle_size_ml != null ? Number(row.bottle_size_ml) : undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function menuItemToRow(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit_type: item.unitType,
    sell_price: item.sellPrice,
    serving_size_ml: item.servingSizeMl,
    pour_sizes: item.pourSizes ?? null,
    bottle_size_ml: item.bottleSizeMl ?? null,
    is_active: item.isActive,
    created_at: item.createdAt,
  };
}

export function rowToStock(row: {
  menu_item_id: string;
  stock_quantity: number;
  purchase_price: number;
  low_stock_threshold: number;
  updated_at: string;
}): StockEntry {
  return {
    menuItemId: row.menu_item_id,
    stockQuantity: Number(row.stock_quantity),
    purchasePrice: Number(row.purchase_price),
    lowStockThreshold: Number(row.low_stock_threshold),
    updatedAt: row.updated_at,
  };
}

export function stockToRow(entry: StockEntry) {
  return {
    menu_item_id: entry.menuItemId,
    stock_quantity: entry.stockQuantity,
    purchase_price: entry.purchasePrice,
    low_stock_threshold: entry.lowStockThreshold,
    updated_at: entry.updatedAt,
  };
}

export function rowToTable(row: {
  id: string;
  number: number;
  name: string;
  status: string;
  active_order_id: string | null;
}): Table {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    status: row.status === "running" ? "running" : "available",
    activeOrderId: row.active_order_id,
  };
}

export function tableToRow(table: Table) {
  return {
    id: table.id,
    number: table.number,
    name: table.name,
    status: table.status,
    active_order_id: table.activeOrderId,
  };
}

export function rowToOrder(row: {
  id: string;
  type: string;
  status: string;
  table_id: string | null;
  table_number: number | null;
  customer_name: string;
  items: Order["items"];
  subtotal: number;
  discount_label: string | null;
  discount_percent: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  payment_cash_amount: number;
  payment_online_amount: number;
  manager_id: string | null;
  manager_name: string;
  created_at: string;
  completed_at: string | null;
}): Order {
  return {
    id: row.id,
    type: row.type as Order["type"],
    status: row.status as Order["status"],
    tableId: row.table_id,
    tableNumber: row.table_number,
    customerName: row.customer_name,
    items: row.items ?? [],
    subtotal: Number(row.subtotal),
    discountLabel: row.discount_label,
    discountPercent: Number(row.discount_percent),
    discountAmount: Number(row.discount_amount),
    total: Number(row.total),
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentCashAmount: Number(row.payment_cash_amount),
    paymentOnlineAmount: Number(row.payment_online_amount),
    managerId: row.manager_id ?? "",
    managerName: row.manager_name,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function orderToRow(order: Order) {
  return {
    id: order.id,
    type: order.type,
    status: order.status,
    table_id: order.tableId,
    table_number: order.tableNumber,
    customer_name: order.customerName,
    items: order.items,
    subtotal: order.subtotal,
    discount_label: order.discountLabel ?? null,
    discount_percent: order.discountPercent ?? 0,
    discount_amount: order.discountAmount ?? 0,
    total: order.total,
    payment_method: order.paymentMethod ?? null,
    payment_cash_amount: order.paymentCashAmount ?? 0,
    payment_online_amount: order.paymentOnlineAmount ?? 0,
    manager_id: order.managerId || null,
    manager_name: order.managerName,
    created_at: order.createdAt,
    completed_at: order.completedAt,
  };
}

export function rowToStockAddition(row: {
  id: string;
  menu_item_id: string;
  item_name: string;
  category: string;
  unit_type: string;
  quantity: number;
  purchase_price: number;
  type: string;
  manager_name: string;
  added_at: string;
}): StockAddition {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    itemName: row.item_name,
    category: row.category,
    unitType: row.unit_type as StockAddition["unitType"],
    quantity: Number(row.quantity),
    purchasePrice: Number(row.purchase_price),
    type: row.type as StockAddition["type"],
    managerName: row.manager_name,
    addedAt: row.added_at,
  };
}

export function stockAdditionToRow(entry: StockAddition) {
  return {
    id: entry.id,
    menu_item_id: entry.menuItemId,
    item_name: entry.itemName,
    category: entry.category,
    unit_type: entry.unitType,
    quantity: entry.quantity,
    purchase_price: entry.purchasePrice,
    type: entry.type,
    manager_name: entry.managerName,
    added_at: entry.addedAt,
  };
}

export function rowToActivity(row: {
  id: string;
  order_id: string | null;
  type: string;
  table_number: number | null;
  customer_name: string | null;
  item_name: string | null;
  quantity: number | null;
  previous_quantity: number | null;
  serving_size_ml: number | null;
  unit_type: string | null;
  amount: number | null;
  bill_total: number | null;
  discount_label: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  payment_method: string | null;
  payment_cash_amount: number | null;
  payment_online_amount: number | null;
  manager_name: string;
  created_at: string;
}): BillActivity {
  return {
    id: row.id,
    orderId: row.order_id ?? "",
    type: row.type as BillActivity["type"],
    tableNumber: row.table_number,
    customerName: row.customer_name ?? "",
    itemName: row.item_name ?? undefined,
    quantity: row.quantity ?? undefined,
    previousQuantity: row.previous_quantity ?? undefined,
    servingSizeMl: row.serving_size_ml ?? undefined,
    unitType: (row.unit_type as BillActivity["unitType"]) ?? undefined,
    amount: row.amount ?? undefined,
    billTotal: row.bill_total ?? undefined,
    discountLabel: row.discount_label ?? undefined,
    discountPercent: row.discount_percent ?? undefined,
    discountAmount: row.discount_amount ?? undefined,
    paymentMethod: (row.payment_method as BillActivity["paymentMethod"]) ?? undefined,
    paymentCashAmount: row.payment_cash_amount ?? undefined,
    paymentOnlineAmount: row.payment_online_amount ?? undefined,
    managerName: row.manager_name,
    timestamp: row.created_at,
  };
}

export function activityToRow(entry: BillActivity) {
  return {
    id: entry.id,
    order_id: entry.orderId || null,
    type: entry.type,
    table_number: entry.tableNumber,
    customer_name: entry.customerName,
    item_name: entry.itemName ?? null,
    quantity: entry.quantity ?? null,
    previous_quantity: entry.previousQuantity ?? null,
    serving_size_ml: entry.servingSizeMl ?? null,
    unit_type: entry.unitType ?? null,
    amount: entry.amount ?? null,
    bill_total: entry.billTotal ?? null,
    discount_label: entry.discountLabel ?? null,
    discount_percent: entry.discountPercent ?? null,
    discount_amount: entry.discountAmount ?? null,
    payment_method: entry.paymentMethod ?? null,
    payment_cash_amount: entry.paymentCashAmount ?? null,
    payment_online_amount: entry.paymentOnlineAmount ?? null,
    manager_name: entry.managerName,
    created_at: entry.timestamp,
  };
}
