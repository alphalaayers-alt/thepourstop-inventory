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
import { tryCreateClient } from "../supabase/client";
import { storageKeys } from "../storage";
import { cloudGetItem } from "./memory";
import {
  activityToRow,
  categoryToRow,
  menuItemToRow,
  orderToRow,
  profileToUser,
  stockAdditionToRow,
  stockToRow,
  tableToRow,
} from "./mappers";

function getClient(): SupabaseClient | null {
  return tryCreateClient();
}

export async function persistStorageKey(key: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  try {
    if (key === storageKeys.menu) {
      const items = (cloudGetItem<MenuItem[]>(key) ?? []).map(menuItemToRow);
      if (items.length === 0) return;
      const { error } = await supabase.from("menu_items").upsert(items, { onConflict: "id" });
      if (error) console.error("Supabase menu sync failed:", error.message);
      return;
    }

    if (key === storageKeys.stock) {
      const entries = (cloudGetItem<StockEntry[]>(key) ?? []).map(stockToRow);
      if (entries.length === 0) return;
      const { error } = await supabase
        .from("stock_entries")
        .upsert(entries, { onConflict: "menu_item_id" });
      if (error) console.error("Supabase stock sync failed:", error.message);
      return;
    }

    if (key === storageKeys.categories) {
      const categories = (cloudGetItem<Category[]>(key) ?? []).map(categoryToRow);
      if (categories.length === 0) return;
      const { error } = await supabase.from("categories").upsert(categories, { onConflict: "id" });
      if (error) console.error("Supabase categories sync failed:", error.message);
      return;
    }

    if (key === storageKeys.orders) {
      const orders = (cloudGetItem<Order[]>(key) ?? []).map(orderToRow);
      if (orders.length === 0) return;
      const { error } = await supabase.from("orders").upsert(orders, { onConflict: "id" });
      if (error) console.error("Supabase orders sync failed:", error.message);
      return;
    }

    if (key === storageKeys.tables) {
      const tables = (cloudGetItem<Table[]>(key) ?? []).map(tableToRow);
      if (tables.length === 0) return;
      const { error } = await supabase.from("restaurant_tables").upsert(tables, { onConflict: "id" });
      if (error) console.error("Supabase tables sync failed:", error.message);
      return;
    }

    if (key === storageKeys.stockAdditions) {
      const additions = (cloudGetItem<StockAddition[]>(key) ?? []).map(stockAdditionToRow);
      if (additions.length === 0) return;
      const { error } = await supabase
        .from("stock_additions")
        .upsert(additions, { onConflict: "id" });
      if (error) console.error("Supabase stock_additions sync failed:", error.message);
      return;
    }

    if (key === storageKeys.activity) {
      const activity = (cloudGetItem<BillActivity[]>(key) ?? []).map(activityToRow);
      if (activity.length === 0) return;
      const { error } = await supabase
        .from("bill_activity")
        .upsert(activity, { onConflict: "id" });
      if (error) console.error("Supabase activity sync failed:", error.message);
      return;
    }

    if (key === storageKeys.users) {
      const users = cloudGetItem<User[]>(key) ?? [];
      const managers = users.filter((u) => u.role === "manager");
      if (managers.length === 0) return;
      const rows = managers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.isActive,
        permissions: u.permissions ?? null,
        created_at: u.createdAt,
      }));
      const { error } = await supabase.from("profiles").upsert(rows, { onConflict: "id" });
      if (error) console.error("Supabase profiles sync failed:", error.message);
    }
  } catch (err) {
    console.error("Supabase persist error:", err);
  }
}

export async function fetchProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<User | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return profileToUser(data);
}
