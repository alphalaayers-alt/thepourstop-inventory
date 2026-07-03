import { useCloudDatabase } from "./data-backend";
import {
  cloudGetItem,
  cloudRemoveItem,
  cloudSetItem,
} from "./cloud/memory";
import { persistStorageKey } from "./cloud/persist";

const USERS_KEY = "pourstop_users";
const SESSION_KEY = "pourstop_session";
const LEGACY_INVENTORY_KEY = "pourstop_inventory";
const MENU_KEY = "pourstop_menu";
const STOCK_KEY = "pourstop_stock";
const ORDERS_KEY = "pourstop_orders";
const TABLES_KEY = "pourstop_tables";

export function getItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  if (useCloudDatabase()) {
    return cloudGetItem<T>(key);
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  if (useCloudDatabase()) {
    cloudSetItem(key, value);
    if (key !== SESSION_KEY && key !== USERS_KEY) {
      void persistStorageKey(key);
    }
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") return;

  if (useCloudDatabase()) {
    cloudRemoveItem(key);
    return;
  }

  localStorage.removeItem(key);
}

export const storageKeys = {
  users: USERS_KEY,
  session: SESSION_KEY,
  inventory: LEGACY_INVENTORY_KEY,
  menu: MENU_KEY,
  stock: STOCK_KEY,
  orders: ORDERS_KEY,
  tables: TABLES_KEY,
  activity: "pourstop_activity",
  dataVersion: "pourstop_data_version",
  categories: "pourstop_categories",
  stockAdditions: "pourstop_stock_additions",
} as const;
