export type BeverageCategory = string;

export type StockUnitType = "bottle" | "pour";

export interface PourSizePrice {
  id?: string;
  ml: number;
  price: number;
  /** Pegs per serve — 1 for single, 6 for a 6-peg combo */
  pours?: number;
  isCombo?: boolean;
  /** Sell whole bottle (e.g. 750ml) on a peg-tracked spirit */
  isFullBottle?: boolean;
  label?: string;
}

/** Menu — what you sell (name, price, ml size) */
export interface MenuItem {
  id: string;
  name: string;
  category: BeverageCategory;
  unitType: StockUnitType;
  sellPrice: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
  bottleSizeMl?: number;
  isActive: boolean;
  createdAt: string;
}

/** Inventory stock — linked to a menu item */
export interface StockEntry {
  menuItemId: string;
  stockQuantity: number;
  purchasePrice: number;
  lowStockThreshold: number;
  updatedAt: string;
}

/** Menu + stock joined (used in UI) */
export interface SellableItem {
  id: string;
  name: string;
  category: BeverageCategory;
  unitType: StockUnitType;
  sellPrice: number;
  servingSizeMl: number;
  pourSizes?: PourSizePrice[];
  bottleSizeMl?: number;
  purchasePrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type InventoryItem = SellableItem;

export interface CreateInventoryInput {
  name: string;
  category: BeverageCategory;
  unitType: StockUnitType;
  purchasePrice: number;
  sellPrice?: number;
  servingSizeMl?: number;
  pourSizes?: PourSizePrice[];
  quantity: number;
  bottleSizeMl?: number;
  lowStockThreshold?: number;
  managerName?: string;
}

export interface RestockInput {
  itemId: string;
  quantity: number;
  purchasePrice?: number;
  managerName?: string;
}

export type StockAdditionType = "initial" | "restock" | "adjustment";

/** Log of stock physically added to inventory */
export interface StockAddition {
  id: string;
  menuItemId: string;
  itemName: string;
  category: BeverageCategory;
  unitType: StockUnitType;
  quantity: number;
  purchasePrice: number;
  type: StockAdditionType;
  managerName: string;
  addedAt: string;
}

export interface Table {
  id: string;
  number: number;
  name: string;
  status: "available" | "running";
  activeOrderId: string | null;
}

export type OrderType = "table" | "walk_in";
export type OrderStatus = "active" | "completed" | "cancelled";
export type PaymentMethodType = "cash" | "online" | "split";

export interface OrderDiscount {
  label: string;
  percent: number;
}

export interface OrderLineItem {
  menuItemId: string;
  itemName: string;
  category: BeverageCategory;
  unitType: StockUnitType;
  quantity: number;
  /** Total ml deducted per qty (30 for single peg, 180 for 6×30ml combo) */
  servingSizeMl: number;
  pourOptionId?: string;
  pourLabel?: string;
  unitPrice: number;
  lineTotal: number;
  stockDeducted: number;
  served: boolean;
  servedAt: string | null;
  addedAt: string;
}

export interface Order {
  id: string;
  type: OrderType;
  tableId: string | null;
  tableNumber: number | null;
  customerName: string;
  items: OrderLineItem[];
  subtotal: number;
  discountLabel?: string | null;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
  paymentMethod?: PaymentMethodType | null;
  paymentCashAmount?: number;
  paymentOnlineAmount?: number;
  status: OrderStatus;
  managerId: string;
  managerName: string;
  createdAt: string;
  completedAt: string | null;
}

export interface AddToOrderInput {
  menuItemId: string;
  quantity: number;
  /** Total ml per serve unit (e.g. 30 single, 180 for 6-peg combo) */
  servingSizeMl?: number;
  pourOptionId?: string;
}

export interface DailySales {
  date: string;
  total: number;
  orderCount: number;
}

export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  todayCustomers: number;
  totalStockItems: number;
  lowStockCount: number;
  totalInventoryValue: number;
}

export interface BillActivity {
  id: string;
  orderId: string;
  type:
    | "item_added"
    | "item_increased"
    | "item_decreased"
    | "item_removed"
    | "bill_completed";
  /** Quantity before an edit (increase/decrease/remove) */
  previousQuantity?: number;
  tableNumber: number | null;
  customerName: string;
  itemName?: string;
  quantity?: number;
  servingSizeMl?: number;
  unitType?: StockUnitType;
  amount?: number;
  billTotal?: number;
  discountLabel?: string;
  discountPercent?: number;
  discountAmount?: number;
  paymentMethod?: PaymentMethodType;
  paymentCashAmount?: number;
  paymentOnlineAmount?: number;
  managerName: string;
  timestamp: string;
}
