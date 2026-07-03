import { tryCreateClient } from "../supabase/client";
import { hydrateCloudStore } from "./hydrate";

export async function refreshCloudData(): Promise<void> {
  const supabase = tryCreateClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await hydrateCloudStore(supabase);
}
