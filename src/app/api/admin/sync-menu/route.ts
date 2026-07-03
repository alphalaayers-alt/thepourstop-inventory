import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { menuItemToRow, rowToMenuItem, stockToRow } from "@/lib/cloud/mappers";
import {
  buildMenuSyncPayload,
  getDefaultCategoryRows,
  MENU_SEED_ITEM_COUNT,
} from "@/lib/menu-seed-sync";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";

function getServiceClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireSuperAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin" || !profile.is_active) {
    return null;
  }

  return user;
}

export async function POST() {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const service = getServiceClient();

    const categories = getDefaultCategoryRows();
    const { error: categoryError } = await service
      .from("categories")
      .upsert(categories, { onConflict: "slug" });
    if (categoryError) {
      return NextResponse.json({ error: categoryError.message }, { status: 500 });
    }

    const { data: existingRows, error: fetchError } = await service
      .from("menu_items")
      .select("*");
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const existingMenu = (existingRows ?? []).map(rowToMenuItem);
    const { menu, stock } = buildMenuSyncPayload(existingMenu);

    const { error: menuError } = await service
      .from("menu_items")
      .upsert(menu.map(menuItemToRow), { onConflict: "id" });
    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    const { error: stockError } = await service
      .from("stock_entries")
      .upsert(stock.map(stockToRow), { onConflict: "menu_item_id" });
    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced: menu.length,
      expected: MENU_SEED_ITEM_COUNT,
      message: `Synced ${menu.length} menu items to live database with 0 stock.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
