import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  REQUIRED_SUPABASE_TABLES,
} from "./env";

function getHealthCheckClient() {
  const url = getSupabaseUrl()!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || getSupabaseAnonKey()!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface SupabaseHealthResult {
  configured: boolean;
  connected: boolean;
  tables: Record<string, boolean>;
  categoryCount: number | null;
  profileCount: number | null;
  usingServiceRole: boolean;
  error: string | null;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      tables: {},
      categoryCount: null,
      profileCount: null,
      usingServiceRole,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    };
  }

  const supabase = getHealthCheckClient();
  const tables: Record<string, boolean> = {};

  for (const table of REQUIRED_SUPABASE_TABLES) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    tables[table] = !error;
  }

  const allTablesOk = REQUIRED_SUPABASE_TABLES.every((t) => tables[t]);

  let categoryCount: number | null = null;
  let profileCount: number | null = null;

  if (tables.categories) {
    const { count } = await supabase
      .from("categories")
      .select("*", { head: true, count: "exact" });
    categoryCount = count;
  }

  if (tables.profiles) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { head: true, count: "exact" });
    profileCount = count;
  }

  const firstMissing = REQUIRED_SUPABASE_TABLES.find((t) => !tables[t]);

  let error: string | null = null;
  if (firstMissing) {
    error = `Table "${firstMissing}" is missing or not accessible. Run supabase/schema.sql in SQL Editor.`;
  } else if (!usingServiceRole && !allTablesOk) {
    error =
      'Some tables are not visible with the anon key. Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full setup checks (server only).';
  }

  const connected = usingServiceRole
    ? allTablesOk
    : Boolean(tables.categories) && (categoryCount ?? 0) > 0;

  return {
    configured: true,
    connected,
    tables,
    categoryCount,
    profileCount: usingServiceRole ? profileCount : null,
    usingServiceRole,
    error: connected ? null : error,
  };
}
