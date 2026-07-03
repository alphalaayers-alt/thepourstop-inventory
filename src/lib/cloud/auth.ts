import type { Session } from "@/types/auth";
import { tryCreateClient } from "../supabase/client";
import { hydrateCloudStore } from "./hydrate";
import { fetchProfileById } from "./persist";
import { clearCloudCache } from "./memory";

export async function cloudLogin(
  email: string,
  password: string
): Promise<{ success: true; session: Session } | { success: false; error: string }> {
  const supabase = tryCreateClient();
  if (!supabase) {
    return { success: false, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return { success: false, error: error?.message ?? "Invalid email or password." };
  }

  const profile = await fetchProfileById(supabase, data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return { success: false, error: "User profile not found. Contact your administrator." };
  }

  if (!profile.isActive) {
    await supabase.auth.signOut();
    return { success: false, error: "This account has been deactivated." };
  }

  await hydrateCloudStore(supabase);

  const session: Session = {
    userId: profile.id,
    role: profile.role,
    email: profile.email,
    name: profile.name,
  };

  return { success: true, session };
}

export async function cloudRestoreSession(): Promise<Session | null> {
  const supabase = tryCreateClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  const profile = await fetchProfileById(supabase, data.session.user.id);
  if (!profile || !profile.isActive) {
    await supabase.auth.signOut();
    clearCloudCache();
    return null;
  }

  await hydrateCloudStore(supabase);

  return {
    userId: profile.id,
    role: profile.role,
    email: profile.email,
    name: profile.name,
  };
}

export async function cloudLogout(): Promise<void> {
  const supabase = tryCreateClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  clearCloudCache();
}
