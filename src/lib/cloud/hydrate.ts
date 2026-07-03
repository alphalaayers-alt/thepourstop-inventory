import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/data/categories";
import type { User } from "@/types/auth";
import type {
  BillActivity,
  MenuItem,
  Order,
  StockAddition,
  StockEntry,
  Table,
} from "@/types/inventory";
import { storageKeys } from "../storage";
import {
  cloudSetItem,
  setCloudHydrated,
} from "./memory";
import {
  profileToUser,
  rowToActivity,
  rowToCategory,
  rowToMenuItem,
  rowToOrder,
  rowToStock,
  rowToStockAddition,
  rowToTable,
} from "./mappers";

export async function hydrateCloudStore(supabase: SupabaseClient): Promise<void> {
  const [
    profilesRes,
    categoriesRes,
    menuRes,
    stockRes,
    ordersRes,
    tablesRes,
    additionsRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("categories").select("*").order("created_at"),
    supabase.from("menu_items").select("*").order("created_at"),
    supabase.from("stock_entries").select("*"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("restaurant_tables").select("*").order("number"),
    supabase.from("stock_additions").select("*").order("added_at", { ascending: false }),
    supabase.from("bill_activity").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (menuRes.error) throw menuRes.error;
  if (stockRes.error) throw stockRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (tablesRes.error) throw tablesRes.error;
  if (additionsRes.error) throw additionsRes.error;
  if (activityRes.error) throw activityRes.error;

  const users: User[] = (profilesRes.data ?? []).map(profileToUser);
  const categories: Category[] = (categoriesRes.data ?? []).map(rowToCategory);
  const menu: MenuItem[] = (menuRes.data ?? []).map(rowToMenuItem);
  const stock: StockEntry[] = (stockRes.data ?? []).map(rowToStock);
  const orders: Order[] = (ordersRes.data ?? []).map(rowToOrder);
  const tables: Table[] = (tablesRes.data ?? []).map(rowToTable);
  const additions: StockAddition[] = (additionsRes.data ?? []).map(rowToStockAddition);
  const activity: BillActivity[] = (activityRes.data ?? []).map(rowToActivity);

  cloudSetItem(storageKeys.users, users);
  cloudSetItem(storageKeys.categories, categories);
  cloudSetItem(storageKeys.menu, menu);
  cloudSetItem(storageKeys.stock, stock);
  cloudSetItem(storageKeys.orders, orders);
  cloudSetItem(storageKeys.tables, tables);
  cloudSetItem(storageKeys.stockAdditions, additions);
  cloudSetItem(storageKeys.activity, activity);
  cloudSetItem(storageKeys.dataVersion, 3);

  setCloudHydrated(true);

  const { seedDefaultMenuItems } = await import("../catalog");
  seedDefaultMenuItems();
}
