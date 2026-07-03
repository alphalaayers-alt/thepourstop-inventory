export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export const REQUIRED_SUPABASE_TABLES = [
  "profiles",
  "categories",
  "menu_items",
  "stock_entries",
  "stock_additions",
  "restaurant_tables",
  "orders",
  "bill_activity",
] as const;
