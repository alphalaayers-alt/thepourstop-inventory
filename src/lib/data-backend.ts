import { isSupabaseConfigured } from "./supabase/env";

/** Production on Vercel uses Supabase; local dev uses browser localStorage. */
export function useCloudDatabase(): boolean {
  return process.env.NODE_ENV === "production" && isSupabaseConfigured();
}

export function getDataBackendLabel(): "cloud" | "local" {
  return useCloudDatabase() ? "cloud" : "local";
}
